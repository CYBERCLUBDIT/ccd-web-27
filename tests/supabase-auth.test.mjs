import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";

process.loadEnvFile(".env.local");
const database = new URL(process.env.DATABASE_URL);
assert.ok(
  ["localhost", "127.0.0.1", "::1", "[::1]"].includes(database.hostname),
  "Auth tests require a local test database",
);

test(
  "Supabase identity, confirmation, PKCE, recovery, and club approval",
  { timeout: 120000 },
  async (t) => {
    const db = new Pool({ connectionString: process.env.DATABASE_URL });
    const suffix = randomUUID();
    const email = `identity-${suffix}@example.test`;
    const socialEmail = `social-${suffix}@example.test`;
    const password = "Test-password-" + suffix;
    const identities = new Map();
    const usedTokens = new Set();
    let expectedChallenge;
    let resetPassword;
    let app;
    let logs = "";
    const user = (mail, confirmed = true) => ({
      id: randomUUID(),
      email: mail,
      aud: "authenticated",
      role: "authenticated",
      email_confirmed_at: confirmed ? new Date().toISOString() : null,
      app_metadata: { provider: "email" },
      user_metadata: {
        name: "Auth integration test",
        role: "admin",
        status: "approved",
      },
      identities: [{ id: randomUUID() }],
      created_at: new Date().toISOString(),
    });
    const social = user(socialEmail);
    identities.set(socialEmail, social);
    function session(identity) {
      const encode = (value) =>
        Buffer.from(JSON.stringify(value)).toString("base64url");
      return {
        access_token: [
          encode({ alg: "HS256", typ: "JWT" }),
          encode({
            sub: identity.id,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
          "test",
        ].join("."),
        refresh_token: "test-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user: identity,
      };
    }
    const mock = createServer(async (req, res) => {
      let text = "";
      for await (const chunk of req) text += chunk;
      const body = text ? JSON.parse(text) : {};
      const url = new URL(req.url, "http://localhost");
      const send = (status, value) => {
        res.writeHead(status, {
          "Content-Type": "application/json",
          "x-supabase-api-version": "2024-01-01",
        });
        res.end(JSON.stringify(value));
      };
      if (url.pathname.endsWith("/signup")) {
        const identity = user(body.email, false);
        identities.set(body.email, identity);
        return send(200, identity);
      }
      if (url.pathname.endsWith("/verify")) {
        if (
          usedTokens.has(body.token_hash) ||
          !["confirm-once", "recover-once"].includes(body.token_hash)
        )
          return send(403, { msg: "Expired token", code: "otp_expired" });
        usedTokens.add(body.token_hash);
        const identity = identities.get(email);
        identity.email_confirmed_at = new Date().toISOString();
        return send(200, session(identity));
      }
      if (url.pathname.endsWith("/token")) {
        if (url.searchParams.get("grant_type") === "pkce") {
          const challenge = createHash("sha256")
            .update(body.code_verifier || "")
            .digest("base64url");
          if (
            body.auth_code !== "oauth-valid" ||
            challenge !== expectedChallenge
          )
            return send(400, {
              msg: "Invalid PKCE",
              code: "bad_code_verifier",
            });
          return send(200, session(social));
        }
        const identity = identities.get(body.email);
        if (!identity || body.password !== (resetPassword || password))
          return send(400, {
            msg: "Bad credentials",
            code: "invalid_credentials",
          });
        if (!identity.email_confirmed_at)
          return send(400, {
            msg: "Email not confirmed",
            code: "email_not_confirmed",
          });
        return send(200, session(identity));
      }
      if (url.pathname.endsWith("/user")) {
        if (req.method === "PUT") resetPassword = body.password;
        return send(200, identities.get(email));
      }
      if (url.pathname.endsWith("/logout")) return send(200, {});
      if (url.pathname.endsWith("/recover") || url.pathname.endsWith("/resend"))
        return send(200, {});
      return send(404, { msg: "Unknown mock endpoint" });
    });
    mock.listen(0, "127.0.0.1");
    await once(mock, "listening");
    const mockOrigin = `http://127.0.0.1:${mock.address().port}`;
    const port = 3317;
    const origin = `http://127.0.0.1:${port}`;
    const jar = new Map();
    function capture(response) {
      for (const value of response.headers.getSetCookie()) {
        const pair = value.split(";")[0],
          split = pair.indexOf("=");
        const name = pair.slice(0, split),
          cookieValue = pair.slice(split + 1);
        if (/max-age=0/i.test(value) || !cookieValue) jar.delete(name);
        else jar.set(name, cookieValue);
      }
      return response;
    }
    const cookieHeader = () =>
      [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
    const get = async (path) =>
      capture(
        await fetch(origin + path, {
          redirect: "manual",
          headers: { Cookie: cookieHeader() },
        }),
      );
    const post = async (data, path = "/api/auth", validOrigin = true) =>
      capture(
        await fetch(origin + path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: validOrigin ? origin : "https://untrusted.example",
            Cookie: cookieHeader(),
            "X-Forwarded-For": "127.1.2.3",
          },
          body: JSON.stringify(data),
        }),
      );
    try {
      await db.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_user_id uuid UNIQUE",
      );
      app = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          String(port),
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: "production",
            APP_ORIGIN: origin,
            SUPABASE_AUTH_ENABLED: "true",
            SUPABASE_URL: mockOrigin,
            SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      app.stdout.on("data", (chunk) => (logs += chunk));
      app.stderr.on("data", (chunk) => (logs += chunk));
      for (let attempt = 0; attempt < 100; attempt++) {
        if (app.exitCode !== null) throw new Error(logs);
        try {
          if ((await fetch(origin + "/sign-in")).ok) break;
        } catch {}
        if (attempt === 99) throw new Error("Test app did not start: " + logs);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      await t.test(
        "signup has no session and unconfirmed password login is denied",
        async () => {
          const r = await post({
            action: "register",
            email,
            password,
            confirmPassword: password,
          });
          assert.equal(r.status, 201, await r.text());
          assert.equal(jar.has("ccd_session"), false);
          const login = await post({ action: "login", email, password });
          assert.equal(login.status, 401);
          assert.match((await login.json()).error, /Confirm your email/);
        },
      );
      await t.test(
        "email confirmation is single-use, grants no approval, and cannot redirect externally",
        async () => {
          const r = await get(
            "/auth/confirm?token_hash=confirm-once&type=email&next=https://untrusted.example",
          );
          assert.equal(r.headers.get("location"), origin + "/complete-profile");
          assert.ok(jar.has("ccd_session"));
          assert.equal((await get("/api/admin")).status, 403);
          const { rows } = await db.query(
            "SELECT role,status FROM users WHERE email=$1",
            [email],
          );
          assert.deepEqual(rows[0], { role: "member", status: "pending" });
          const replay = await get(
            "/auth/confirm?token_hash=confirm-once&type=email",
          );
          assert.match(replay.headers.get("location"), /confirmation_failed/);
        },
      );
      await t.test(
        "account form precedes three-step onboarding for verified email users",
        async () => {
          const form = await (await get("/join")).text();
          assert.match(form, /name="confirmPassword"/);
          assert.doesNotMatch(form, /name="registrationNumber"/);
          assert.ok(
            form.indexOf('name="confirmPassword"') <
              form.indexOf("Continue with"),
          );
          const onboarding = await (await get("/complete-profile")).text();
          assert.match(onboarding, /About you/);
          assert.match(onboarding, /Student details/);
          assert.match(onboarding, /Application sent/);
          assert.match(onboarding, /name="phone"/);
          assert.doesNotMatch(onboarding, /name="course"/);
          const r = await post({
            action: "complete_profile",
            name: "Auth integration test",
            registrationNumber: "TEST-" + suffix,
            phone: "+255700000000",
            course: "Integration",
          });
          assert.equal(r.status, 200);
          const status = await (await get("/membership-status")).text();
          assert.match(status, /Congratulations!/);
          assert.match(status, /Please wait for approval/);
        },
      );
      await t.test(
        "approved login works and approval revocation removes access",
        async () => {
          await db.query("UPDATE users SET status='approved' WHERE email=$1", [
            email,
          ]);
          assert.equal(
            (await post({ action: "login", email, password })).status,
            200,
          );
          const member = await get("/member");
          assert.equal(member.status, 200);
          await db.query("UPDATE users SET status='rejected' WHERE email=$1", [
            email,
          ]);
          const revoked = await get("/member");
          if (revoked.status === 307)
            assert.equal(
              new URL(revoked.headers.get("location"), origin).pathname,
              "/membership-status",
            );
          else assert.match(await revoked.text(), /\/membership-status/);
          assert.equal(
            (await post({ action: "login", email, password })).status,
            403,
          );
          await db.query("UPDATE users SET status='pending' WHERE email=$1", [
            email,
          ]);
        },
      );
      await t.test(
        "social login uses PKCE and rejects missing verifier and bad origins",
        async () => {
          assert.equal(
            (await post({ provider: "google" }, "/auth/provider", false))
              .status,
            400,
          );
          assert.equal(
            (await post({ provider: "unsupported" }, "/auth/provider")).status,
            400,
          );
          const start = await post({ provider: "github" }, "/auth/provider");
          assert.equal(start.status, 200);
          const url = new URL((await start.json()).url);
          expectedChallenge = url.searchParams.get("code_challenge");
          assert.ok(expectedChallenge);
          assert.equal(url.searchParams.get("code_challenge_method"), "s256");
          const callback = new URL(url.searchParams.get("redirect_to"));
          callback.searchParams.set("code", "oauth-valid");
          const saved = new Map(jar);
          jar.clear();
          const denied = await get(callback.pathname + callback.search);
          assert.match(denied.headers.get("location"), /confirmation_failed/);
          for (const [key, value] of saved) jar.set(key, value);
          const success = await get(callback.pathname + callback.search);
          assert.equal(
            success.headers.get("location"),
            origin + "/complete-profile",
          );
          const { rows } = await db.query(
            "SELECT role,status FROM users WHERE email=$1",
            [socialEmail],
          );
          assert.deepEqual(rows[0], { role: "member", status: "pending" });
        },
      );
      await t.test(
        "social members must complete details without changing roles or approval",
        async () => {
          assert.equal(
            (
              await post({
                action: "complete_profile",
                name: "Social integration test",
                registrationNumber: "SOCIAL-" + suffix,
                phone: "+255700000001",
                course: "Integration",
                role: "admin",
                status: "approved",
              })
            ).status,
            200,
          );
          const { rows } = await db.query(
            "SELECT role,status,registration_number FROM users WHERE email=$1",
            [socialEmail],
          );
          assert.equal(rows[0].role, "member");
          assert.equal(rows[0].status, "pending");
          assert.ok(rows[0].registration_number);
          assert.equal((await get("/api/admin")).status, 403);
        },
      );
      await t.test(
        "recovery requires a valid token and invalidates existing sessions",
        async () => {
          assert.equal(
            (
              await post({
                action: "reset",
                password: "Different-password-123",
              })
            ).status,
            400,
          );
          const recovery = await get(
            "/auth/confirm?token_hash=recover-once&type=recovery",
          );
          assert.equal(
            recovery.headers.get("location"),
            origin + "/reset-password",
          );
          const recoveryCookie = jar.get("ccd_recovery");
          const reset = await post({
            action: "reset",
            password: "Different-password-123",
          });
          assert.equal(reset.status, 200, await reset.text());
          assert.equal(jar.has("ccd_recovery"), false);
          jar.set("ccd_recovery", recoveryCookie);
          assert.equal(
            (await post({ action: "reset", password: "Another-password-123" }))
              .status,
            400,
          );
          jar.delete("ccd_recovery");
          assert.equal(
            (
              await db.query(
                "SELECT count(*)::int AS count FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.email=$1",
                [email],
              )
            ).rows[0].count,
            0,
          );
        },
      );
    } finally {
      if (app) {
        const exited = once(app, "exit");
        app.kill();
        await Promise.race([
          exited,
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
      }
      mock.closeAllConnections();
      await new Promise((resolve) => mock.close(resolve));
      await db.query("DELETE FROM users WHERE email=ANY($1::text[])", [
        [email, socialEmail],
      ]);
      await db.query(
        "DELETE FROM login_limits WHERE key LIKE $1 OR key LIKE $2 OR key LIKE '%:127.1.2.3'",
        ["%" + email, "%" + socialEmail],
      );
      await db.end();
    }
  },
);
