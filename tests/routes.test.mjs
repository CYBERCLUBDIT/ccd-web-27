import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { randomUUID, randomBytes, scryptSync, createHash } from "node:crypto";
process.loadEnvFile(".env.local");
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3000";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const testIp =
  "127.0." +
  Math.floor(Math.random() * 250 + 1) +
  "." +
  Math.floor(Math.random() * 250 + 1);
const suffix = randomUUID(),
  email = `test-${suffix}@example.test`,
  adminEmail = `admin-test-${suffix}@example.test`;
const password = randomBytes(20).toString("hex");
let contentId;
async function post(path, data, cookie, validOrigin = true) {
  return fetch(origin + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": testIp,
      ...(validOrigin ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(data),
  });
}
function cookie(response) {
  return response.headers.get("set-cookie")?.split(";")[0];
}
test("PostgreSQL membership, authentication, approval and publishing", async (t) => {
  try {
    await t.test("public pages and real empty states render", async () => {
      for (const path of [
        "/",
        "/about",
        "/gallery",
        "/events",
        "/resources",
        "/contact",
        "/join",
        "/sign-in",
      ]) {
        const r = await fetch(origin + path);
        assert.equal(r.status, 200, path);
        const text = await r.text();
        assert.ok(!text.includes("Amina Hassan"));
        assert.ok(!text.includes("Sample story"));
      }
    });
    await t.test(
      "learning replaces old navigation and contact messages persist",
      async () => {
        for (const path of ["/activities", "/resources"]) {
          const oldPage = await fetch(origin + path, { redirect: "manual" });
          assert.equal(oldPage.status, 308);
          assert.equal(oldPage.headers.get("location"), "/learning");
        }
        const learning = await (await fetch(origin + "/learning")).text();
        assert.match(learning, /Spot the phishing email/);
        assert.match(learning, /Demo labs/);
        assert.ok(!learning.includes('href="/activities"'));
        assert.ok(!learning.includes('href="/resources"'));
        const invalid = await post("/api/club", {
          action: "contact",
          name: "Test member",
          email,
          message: "short",
        });
        assert.equal(invalid.status, 400);
        const saved = await post("/api/club", {
          action: "contact",
          name: "Test member",
          email,
          message: "Temporary integration contact message.",
        });
        assert.equal(saved.status, 200);
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS count FROM messages WHERE email=$1",
              [email],
            )
          ).rows[0].count,
          1,
        );
      },
    );
    await t.test("anonymous admin access denied", async () => {
      assert.equal((await fetch(origin + "/api/admin")).status, 403);
      const r = await fetch(origin + "/admin", { redirect: "manual" });
      if (r.status === 200) {
        const html = await r.text();
        assert.ok(html.includes("/sign-in"));
        assert.ok(!html.includes("Review membership, publish club content"));
      } else assert.equal(r.status, 307);
    });
    await t.test(
      "security headers and bounded JSON protect public requests",
      async () => {
        const page = await fetch(origin + "/gallery");
        assert.equal(page.headers.get("x-content-type-options"), "nosniff");
        assert.equal(page.headers.get("x-frame-options"), "DENY");
        assert.equal(page.headers.get("referrer-policy"), "no-referrer");
        assert.match(
          page.headers.get("content-security-policy"),
          /frame-ancestors 'none'/,
        );
        for (const path of ["/api/auth", "/api/club"]) {
          const oversized = await post(path, {
            action: "contact",
            message: "x".repeat(70000),
          });
          assert.equal(oversized.status, 400);
          const malformed = await post(path, ["invalid"]);
          assert.equal(malformed.status, 400);
          const wrongType = await fetch(origin + path, {
            method: "POST",
            headers: { Origin: origin, "Content-Type": "text/plain" },
            body: "{}",
          });
          assert.equal(wrongType.status, 400);
          const streamed = await fetch(origin + path, {
            method: "POST",
            headers: { Origin: origin, "Content-Type": "application/json" },
            duplex: "half",
            body: new ReadableStream({
              start(controller) {
                controller.enqueue(
                  new TextEncoder().encode(
                    JSON.stringify({ padding: "x".repeat(70000) }),
                  ),
                );
                controller.close();
              },
            }),
          });
          assert.equal(streamed.status, 400);
        }
        const hiddenDetail = await fetch(
          origin + "/events/00000000-0000-0000-0000-000000000000",
        );
        assert.ok([200, 404].includes(hiddenDetail.status));
        assert.match(await hiddenDetail.text(), /This page is off the map/);
      },
    );
    await t.test("mutations require same origin", async () => {
      assert.equal(
        (await post("/api/auth", { action: "register" }, null, false)).status,
        400,
      );
    });
    await t.test("registration validates server-side", async () => {
      assert.equal(
        (await post("/api/auth", { action: "register", email, password }))
          .status,
        400,
      );
    });
    await t.test(
      "registration creates a pending PostgreSQL account",
      async () => {
        const r = await post("/api/auth", {
          action: "register",
          name: "Integration Test",
          email,
          password,
          registrationNumber: suffix,
          phone: "+255700000000",
          course: "od24coe",
        });
        assert.equal(r.status, 201);
        const { rows } = await db.query(
          "SELECT status,password_hash FROM users WHERE email=$1",
          [email],
        );
        assert.equal(rows[0].status, "pending");
        assert.notEqual(rows[0].password_hash, password);
      },
    );
    await t.test("duplicate accounts rejected", async () => {
      assert.equal(
        (
          await post("/api/auth", {
            action: "register",
            name: "Integration Test",
            email,
            password,
            registrationNumber: suffix,
            phone: "+255700000000",
            course: "od24coe",
          })
        ).status,
        409,
      );
    });
    await t.test("pending member cannot sign in", async () => {
      assert.equal(
        (await post("/api/auth", { action: "login", email, password })).status,
        403,
      );
    });
    const salt = randomBytes(16).toString("hex");
    await db.query(
      "INSERT INTO users(name,email,password_hash,role,status) VALUES('Integration administrator',$1,$2,'admin','approved')",
      [adminEmail, salt + ":" + scryptSync(password, salt, 64).toString("hex")],
    );
    const adminLogin = await post("/api/auth", {
      action: "login",
      email: adminEmail,
      password,
    });
    assert.equal(adminLogin.status, 200);
    const adminCookie = cookie(adminLogin);
    const { rows: members } = await db.query(
      "SELECT id FROM users WHERE email=$1",
      [email],
    );
    const id = members[0].id;
    await t.test("administrator approves account", async () => {
      assert.equal(
        (await post("/api/admin", { action: "approve", id }, adminCookie))
          .status,
        200,
      );
    });
    const login = await post("/api/auth", { action: "login", email, password });
    assert.equal(login.status, 200);
    const studentCookie = cookie(login);
    await t.test(
      "approved member signs in with HTTP-only session",
      async () => {
        assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
        assert.equal(
          (
            await fetch(origin + "/member", {
              headers: { Cookie: studentCookie },
            })
          ).status,
          200,
        );
      },
    );
    await t.test("wrong password denied", async () => {
      assert.equal(
        (
          await post("/api/auth", {
            action: "login",
            email,
            password: password + "wrong",
          })
        ).status,
        401,
      );
    });
    await t.test("student cannot administer", async () => {
      assert.equal(
        (
          await fetch(origin + "/api/admin", {
            headers: { Cookie: studentCookie },
          })
        ).status,
        403,
      );
      assert.equal(
        (await post("/api/admin", { action: "approve", id }, studentCookie))
          .status,
        403,
      );
    });
    await t.test("content is persisted and publicly published", async () => {
      assert.equal(
        (
          await post(
            "/api/admin",
            {
              action: "content",
              kind: "event",
              title: `Integration event ${suffix}`,
              description: "Temporary integration record",
              category: "Workshop",
              event_date: "2030-01-01T10:00:00+03:00",
              published: true,
            },
            adminCookie,
          )
        ).status,
        200,
      );
      const { rows } = await db.query("SELECT id FROM content WHERE title=$1", [
        `Integration event ${suffix}`,
      ]);
      contentId = rows[0].id;
      const data = await (await fetch(origin + "/api/club")).json();
      assert.ok(data.content.some((c) => c.id === contentId));
      for (const item of data.content) {
        assert.ok(!Object.hasOwn(item, "created_by"));
        assert.ok(!Object.hasOwn(item, "created_at"));
      }
    });
    await t.test("member booking and admin attendance persist", async () => {
      assert.equal(
        (
          await post(
            "/api/club",
            { action: "book", eventId: contentId },
            studentCookie,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await post(
            "/api/admin",
            {
              action: "attendance",
              eventId: contentId,
              userId: id,
              attended: true,
            },
            adminCookie,
          )
        ).status,
        200,
      );
      const { rows } = await db.query(
        "SELECT attended FROM attendance WHERE event_id=$1 AND user_id=$2",
        [contentId, id],
      );
      assert.equal(rows[0].attended, true);
    });
    await t.test("unpublishing removes public content", async () => {
      assert.equal(
        (
          await post(
            "/api/admin",
            { action: "publish", id: contentId, published: false },
            adminCookie,
          )
        ).status,
        200,
      );
      const data = await (await fetch(origin + "/api/club")).json();
      assert.ok(!data.content.some((c) => c.id === contentId));
    });
    await t.test("approval revocation invalidates access", async () => {
      assert.equal(
        (await post("/api/admin", { action: "reject", id }, adminCookie))
          .status,
        200,
      );
      assert.equal(
        (
          await fetch(origin + "/api/auth", {
            headers: { Cookie: studentCookie },
          }).then((r) => r.json())
        ).user,
        null,
      );
    });
    await t.test(
      "password reset tokens expire after one use and cannot approve accounts",
      async () => {
        const token = randomBytes(32).toString("hex");
        await db.query(
          "INSERT INTO password_tokens VALUES($1,$2,now()+interval '1 hour')",
          [createHash("sha256").update(token).digest("hex"), id],
        );
        const newPassword = randomBytes(20).toString("hex");
        assert.equal(
          (
            await post("/api/auth", {
              action: "reset",
              token,
              password: newPassword,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await post("/api/auth", {
              action: "reset",
              token,
              password: newPassword,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await post("/api/auth", {
              action: "login",
              email,
              password: newPassword,
            })
          ).status,
          403,
        );
      },
    );
    await t.test("logout revokes admin session", async () => {
      assert.equal(
        (await post("/api/auth", { action: "logout" }, adminCookie)).status,
        200,
      );
      assert.equal(
        (
          await fetch(origin + "/api/admin", {
            headers: { Cookie: adminCookie },
          })
        ).status,
        403,
      );
    });
  } finally {
    await db.query("DELETE FROM messages WHERE email=$1", [email]);
    if (contentId)
      await db.query("DELETE FROM content WHERE id=$1", [contentId]);
    await db.query(
      "DELETE FROM audit_log WHERE actor_id IN(SELECT id FROM users WHERE email=$1) OR target_id IN(SELECT id FROM users WHERE email=$2)",
      [adminEmail, email],
    );
    await db.query("DELETE FROM users WHERE email=ANY($1::text[])", [
      [email, adminEmail],
    ]);
    await db.query(
      "DELETE FROM login_limits WHERE key LIKE $1 OR key LIKE $2",
      ["%" + email, "%" + adminEmail],
    );
    await db.query("DELETE FROM login_limits WHERE key=ANY($1::text[])", [
      [
        `login:${testIp}`,
        `register:${testIp}`,
        `reset:${testIp}`,
        `contact:${testIp}`,
      ],
    ]);
    await db.end();
  }
});
