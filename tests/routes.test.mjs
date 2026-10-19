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
const extraContentIds = [];
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
    await t.test(
      "admin sections load only their own bounded data",
      async () => {
        const requestView = async (view) => {
          const r = await fetch(origin + "/api/admin?view=" + view, {
            headers: { Cookie: adminCookie },
          });
          assert.equal(r.status, 200);
          assert.match(r.headers.get("cache-control"), /no-store/);
          return r.json();
        };
        const desk = await requestView("overview");
        assert.ok(
          desk.members.length <= 5 &&
            desk.members.every((m) => m.status === "pending"),
        );
        assert.ok(
          desk.content.length <= 3 &&
            desk.content.every(
              (c) => !c.published && !Object.hasOwn(c, "body"),
            ),
        );
        assert.ok(desk.messages.length <= 3);
        assert.ok(!Object.hasOwn(desk, "attendance"));
        assert.deepEqual(Object.keys(await requestView("members")), [
          "members",
        ]);
        assert.deepEqual(Object.keys(await requestView("messages")), [
          "messages",
        ]);
        const heavy = "Detail only: " + "x".repeat(3000);
        await db.query("UPDATE content SET body=$1 WHERE id=$2", [
          heavy,
          contentId,
        ]);
        const library = await requestView(
          "content&kind=event&search=" + encodeURIComponent(suffix),
        );
        assert.equal(library.total, 1);
        assert.equal(library.content[0].id, contentId);
        assert.ok(!Object.hasOwn(library.content[0], "body"));
        assert.ok(!Object.hasOwn(library.content[0], "created_by"));
        const detail = await requestView("content&id=" + contentId);
        assert.equal(detail.item.body, heavy);
        for (const query of [
          "view=unknown",
          "view=content&kind=invalid",
          "view=content&page=-1",
          "view=content&status=invalid",
          "view=content&id=bad-id",
        ]) {
          assert.equal(
            (
              await fetch(origin + "/api/admin?" + query, {
                headers: { Cookie: adminCookie },
              })
            ).status,
            400,
          );
        }
        assert.equal(
          (
            await fetch(origin + "/api/admin?view=content&id=" + randomUUID(), {
              headers: { Cookie: adminCookie },
            })
          ).status,
          404,
        );
        assert.equal(
          (
            await fetch(origin + "/api/admin?view=content", {
              headers: { Cookie: studentCookie },
            })
          ).status,
          403,
        );
      },
    );
    await t.test(
      "content library paginates and filters drafts without loading bodies",
      async () => {
        const prefix = "Pagination-" + suffix;
        const seeded = await db.query(
          "INSERT INTO content(kind,title) SELECT 'news',$1||'-'||n FROM generate_series(1,13) AS n RETURNING id",
          [prefix],
        );
        extraContentIds.push(...seeded.rows.map((row) => row.id));
        const page = async (n) =>
          (
            await fetch(
              origin +
                "/api/admin?view=content&kind=news&status=draft&search=" +
                encodeURIComponent(prefix) +
                "&page=" +
                n,
              { headers: { Cookie: adminCookie } },
            )
          ).json();
        const first = await page(1),
          second = await page(2);
        assert.equal(first.total, 13);
        assert.equal(first.content.length, 12);
        assert.equal(second.content.length, 1);
        assert.ok(!first.content.some((c) => c.id === second.content[0].id));
        assert.ok(
          first.content.every((c) => !c.published && !Object.hasOwn(c, "body")),
        );
      },
    );
    await t.test(
      "existing content can be edited without changing its author",
      async () => {
        const original = (
          await db.query("SELECT created_by FROM content WHERE id=$1", [
            contentId,
          ])
        ).rows[0];
        const fields = {
          action: "content",
          id: contentId,
          kind: "event",
          title: `Integration event ${suffix}`,
          description: "Updated summary",
          body: "Edited full text",
          category: "Workshop",
          event_date: "2030-01-01T10:00:00+03:00",
          published: true,
          image_url: "/images/summit/7095.webp",
        };
        assert.equal(
          (await post("/api/admin", fields, studentCookie)).status,
          403,
        );
        assert.equal(
          (await post("/api/admin", fields, adminCookie)).status,
          200,
        );
        const updated = (
          await db.query(
            "SELECT body,created_by,image_url FROM content WHERE id=$1",
            [contentId],
          )
        ).rows[0];
        assert.equal(updated.body, "Edited full text");
        assert.equal(updated.created_by, original.created_by);
        assert.equal(updated.image_url, "/images/summit/7095.webp");
        assert.equal(
          (
            await post(
              "/api/admin",
              { ...fields, image_url: "/images/../../private.env" },
              adminCookie,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await post(
              "/api/admin",
              { ...fields, id: randomUUID() },
              adminCookie,
            )
          ).status,
          400,
        );
      },
    );
    await t.test(
      "event booking persists while retired attendance actions are rejected",
      async () => {
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
          400,
        );
        const { rows } = await db.query(
          "SELECT attended FROM attendance WHERE event_id=$1 AND user_id=$2",
          [contentId, id],
        );
        assert.equal(rows[0].attended, false);
      },
    );
    await t.test(
      "analytics and audit reports require administrator access",
      async () => {
        for (const view of ["analytics", "audit"]) {
          const path = origin + "/api/admin/insights?view=" + view;
          assert.equal((await fetch(path)).status, 403);
          assert.equal(
            (await fetch(path, { headers: { Cookie: studentCookie } })).status,
            403,
          );
        }
      },
    );
    await t.test(
      "analytics reports actual registrations and daily unique visitors",
      async () => {
        const r = await fetch(origin + "/api/admin/insights?view=analytics", {
          headers: { Cookie: adminCookie },
        });
        assert.equal(r.status, 200);
        assert.match(r.headers.get("cache-control"), /no-store/);
        const data = await r.json();
        assert.equal(data.months.length, 6);
        assert.ok(data.membership.approved >= 1);
        const event = data.events.find((e) => e.id === contentId);
        assert.equal(event.registrations, 1);
        assert.equal(data.attendance, undefined);
        assert.equal(data.visitors.days.length, 14);
        assert.ok(data.visitors.today >= 0);
        assert.ok(data.visitors.total >= data.visitors.week);
        for (const page of ["analytics", "audit"]) {
          const html = await (
            await fetch(origin + "/admin/" + page, {
              headers: { Cookie: adminCookie },
            })
          ).text();
          assert.match(
            html,
            page === "analytics" ? /Club analytics/ : /Audit logs/,
          );
        }
      },
    );
    await t.test(
      "audit records mutations and pages without duplicate records",
      async () => {
        const fetchAudit = async (query) => {
          const r = await fetch(
            origin + "/api/admin/insights?view=audit&" + query,
            { headers: { Cookie: adminCookie } },
          );
          assert.equal(r.status, 200);
          return r.json();
        };
        const actions = await db.query(
          "SELECT action FROM audit_log WHERE actor_id=(SELECT id FROM users WHERE email=$1)",
          [adminEmail],
        );
        for (const action of ["approve", "content.create"])
          assert.ok(actions.rows.some((row) => row.action === action));
        await db.query(
          "INSERT INTO audit_log(actor_id,action,target_id) SELECT u.id,'content.create',$2 FROM users u CROSS JOIN generate_series(1,27) WHERE u.email=$1",
          [adminEmail, contentId],
        );
        const query =
          "action=content.create&search=" + encodeURIComponent(suffix);
        const first = await fetchAudit(query + "&before=");
        assert.equal(first.items.length, 25);
        assert.ok(first.nextCursor);
        const second = await fetchAudit(query + "&before=" + first.nextCursor);
        assert.ok(second.items.length > 0);
        assert.ok(
          second.items.every(
            (item) => !first.items.some((other) => other.id === item.id),
          ),
        );
        assert.ok(
          first.items.every(
            (item) =>
              item.target_id === contentId &&
              !Object.hasOwn(item, "password_hash"),
          ),
        );
        for (const query of [
          "before=invalid",
          "before=9999999999999999999",
          "action=unknown",
        ])
          assert.equal(
            (
              await fetch(origin + "/api/admin/insights?view=audit&" + query, {
                headers: { Cookie: adminCookie },
              })
            ).status,
            400,
          );
      },
    );
    await t.test(
      "failed administrative changes do not write audit events",
      async () => {
        const count = async () =>
          (
            await db.query(
              "SELECT count(*) FROM audit_log WHERE actor_id=(SELECT id FROM users WHERE email=$1)",
              [adminEmail],
            )
          ).rows[0].count;
        const before = await count();
        assert.equal(
          (
            await post(
              "/api/admin",
              { action: "publish", id: randomUUID(), published: true },
              adminCookie,
            )
          ).status,
          400,
        );
        assert.equal(await count(), before);
      },
    );
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
    if (extraContentIds.length)
      await db.query("DELETE FROM content WHERE id=ANY($1::uuid[])", [
        extraContentIds,
      ]);
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
