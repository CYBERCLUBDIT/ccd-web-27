# Cyber Club DIT — ccd-web-27

The Cyber Club DIT website combines a public club website, student membership portal, and administrator workspace. It helps the club publish its activities, review membership applications, share learning resources, and record event bookings and attendance.

Repository: https://github.com/CYBERCLUBDIT/ccd-web-27

### Managed authentication rollout

Production uses Supabase email/password signup with an emailed verification code, Google sign-in, and three-step membership onboarding (`SUPABASE_AUTH_ENABLED=true`). The account form asks for email, password, and confirm password before verification; student details follow verification. GitHub is deferred and its button is disabled until both Supabase credentials and `SUPABASE_GITHUB_ENABLED=true` are configured. [The authentication setup guide](docs/auth-setup.md) covers provider setup and recovery. Before upgrading an existing database, apply `scripts/onboarding.sql`. A server-written `onboarding_completed_at` timestamp records submission of both detail forms; existing registration numbers do not count as completed onboarding. New verified students must finish About you → Student details → Application sent, then wait for administrator approval. Already-approved students confirm their details once and keep their approval. Administrators use their separate workspace. Legacy instructions below apply only to installations with managed authentication disabled. Administrator sign-in is at `/admin/sign-in`, with the protected workspace at `/admin`. Roles and membership approval are always read from PostgreSQL.

## For business owners and club administrators

Visitors can learn about the club, browse published events and news, explore resources and gallery images, submit contact messages, and apply for membership. Approved members can sign in to the member workspace and register for upcoming published events. Administrators review applications, publish club content, read contact messages, and mark event attendance.

The application stores operational data in PostgreSQL. A GitHub copy preserves the application code; it does **not** back up the live database, hosting configuration, or private environment files.

### Membership workflow

1. A student opens `/join` and submits their name, email, registration number, phone, course, and password.
2. The application is stored with a pending status. Pending and rejected accounts cannot sign in.
3. An approved administrator signs in at `/sign-in`, opens `/admin`, and approves or rejects the application.
4. An approved student signs in and enters `/member`.
5. Changes to membership approval invalidate that user's existing sessions.

Passwords must contain 12–128 characters. Email addresses and registration numbers must be unique.

### Publishing and event operations

Administrators can create events, news, resources, gallery entries, challenges, leader profiles, and testimonials. Publish an entry to make it available to the public; unpublish it to hide it. Events require a date. Image and external links must use HTTPS.

Members can book published events whose start time is still in the future. Administrators mark attendance against bookings. Contact form submissions are available in the administrator workspace; submitting a message does not send an email.

The featured imagery and gallery use nine selected photographs from the Cybersecurity Summit, dated 23 May 2026 in the source album, with photography credited to Lazaro Grapher. The owner supplied six photos; three additional photos were selected from the owner-shared album. WebP derivatives are in `public/images/summit/`; the private album invitation token is not included in the repository. Image attribution is recorded in `public/images/SOURCES.md`.

To add the real summit event, news story, and nine gallery entries, run `node --env-file=.env.local scripts/seed-summit.mjs` against your intended database (or provide `DATABASE_URL` through the deployment environment). This is an explicit publishing action: entries are public. Fixed IDs make reruns safe, preserve later administrator edits, and avoid duplicate entries. Deploy the image assets before seeding production. No fictional members, leaders, testimonials, or future event dates are created.

### Understanding the homepage totals

Public counters use the larger of recorded activity and owner-supplied historical totals. The schema currently initializes historical figures of 300+ members, 5 events, 5 workshops, 100+ CTFs, and 500+ attendance. These are aggregate figures in `reported_totals`; they do not create individual membership, event, or attendance records. A developer should verify these figures with the owner before a new deployment. Event-derived workshop and CTF counts use the event categories `workshop` and `ctf`.

## Learning and contact pages

`/learning` replaces the old Activities and Resources pages; those URLs redirect permanently to Learning. The catalogue contains six explicitly labelled demo labs in `src/lib/learning-labs.ts`. Search, topic and difficulty filters, exercise previews, and answer feedback run in the browser. The examples use fictional evidence; they do not start virtual machines, scan targets, award membership credit, or save completion to an account. Published resource entries remain available in the “From the club” section below the demo catalogue.

The contact page uses the existing `/api/club` contact action. Messages persist in PostgreSQL for administrators to read; responses are handled by the club team. Contact rate limits apply per client address, so one sender cannot exhaust a single shared contact quota for everyone.

## Technology

- Next.js 16 App Router and React 19.
- TypeScript, Tailwind CSS v4, shadcn/Radix UI components, and Lucide icons.
- Motion for animation, with reduced-motion support.
- PostgreSQL through the `pg` driver.
- Space Grotesk headings and Figtree body text; responsive light and dark themes.
- Node's built-in test runner for integration and theme tests.

Use the committed `package-lock.json` with `npm ci` to reproduce dependency versions. The application needs a Node server and PostgreSQL; it is not a static-only website.

## Developer setup

### Requirements

- Node.js 22 LTS or newer with npm. Project scripts use `process.loadEnvFile`.
- PostgreSQL 18 is the project's documented database baseline.
- Git, and access to the repository.
- PostgreSQL command-line tools (`psql`, `pg_dump`, `pg_restore`) for database administration and backups.

### 1. Clone and install

```sh
git clone https://github.com/CYBERCLUBDIT/ccd-web-27.git
cd ccd-web-27
npm ci
```

### 2. Create the database

Using a PostgreSQL administrator session, create a dedicated application role and database. Replace the example password before running:

```sql
CREATE ROLE cyberclub_app LOGIN PASSWORD 'replace-with-a-strong-unique-password';
CREATE DATABASE cyberclubdit OWNER cyberclub_app;
```

Create `.env.local` in the repository root:

```dotenv
DATABASE_URL=postgresql://cyberclub_app:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:5432/cyberclubdit
APP_ORIGIN=http://127.0.0.1:3000
```

URL-encode special characters in the connection-string password. `.env.local` is ignored by Git. Keep actual credentials out of commits, screenshots, and shared logs.

`APP_ORIGIN` must exactly match the browser's origin, including protocol, hostname, and port, with no trailing slash. Locally, use `http://127.0.0.1:3000` consistently; `localhost` is a different origin.

An optional helper, `node scripts/setup-db.mjs`, creates the role, database, and `.env.local` with a random password. It requires `psql` on PATH and an already configured, noninteractive PostgreSQL administrator connection as `postgres` on `localhost`. It refuses to run when `.env.local` exists and is intended for a fresh database installation; it does not handle existing role/database names or roll back a partially completed setup. Manual setup above is suitable when those assumptions do not apply.

### 3. Initialize the schema and administrator

```sh
node scripts/migrate.mjs
```

This applies `scripts/schema.sql`, initializes historical aggregate totals, and provisions the administrator email currently hard-coded in `scripts/migrate.mjs`: `ezekielezekiel003@gmail.com`. It does not insert sample members or sample content. For a deployment with a different owner, review and change this bootstrap email before running the script.

If the administrator has no password, the script creates a private one-time setup link in `.local/admin-setup.txt`. It expires after 24 hours. Open the link once the app is running, choose a password, and delete the private file afterward. Re-running migration before a password is set replaces the previous setup token. Once a password exists, migration does not reset it; the script's setup-file console message is not proof that a new token was generated.

The bootstrap setup link uses `http://127.0.0.1:3000` explicitly. For a hosted installation, use the password-reset script below after configuring the correct `APP_ORIGIN` to generate a link for that domain.

### 4. Start development

```sh
npm run dev
```

Open http://127.0.0.1:3000. Sign in at `/sign-in` after setting the administrator password, then open `/admin`. Stop the server with Ctrl+C.

## Commands and validation

Run commands from the repository root.

- `npm run dev` — start the development server on `127.0.0.1:3000`.
- `npm run build` — create a production build.
- `npm start` — serve an existing production build on `127.0.0.1:3000`.
- `npm run typecheck` — check TypeScript without emitting files.
- `npm test` — run all integration and theme tests.
- `node --test tests/theme.test.mjs` — run theme tests without a database or app server.
- `node scripts/migrate.mjs` — apply schema and provision the bootstrap administrator.
- `node scripts/reset-password.mjs user@example.com` — issue a private password-reset link.
- `node scripts/check-db.mjs` — apply the schema, then print counts of admins, members, content, and sessions. **This command can write schema and historical totals; it is not a read-only health check.**

### Running integration tests

Use a dedicated development/test database, never production. The integration suite creates real accounts, content, sessions, and bookings, then cleans up its temporary records. It also exercises existing public pages. The suite restricts the HTTP target to a loopback hostname, but that does not prevent a misconfigured `DATABASE_URL` from pointing at production.

1. Configure `.env.local` with the test database and matching local `APP_ORIGIN`.
2. Run `node scripts/migrate.mjs` against that database.
3. Start the application with `npm run dev` in one terminal.
4. Run these checks in a second terminal:

```sh
npm run typecheck
npm run build
npm test
```

The test server must use the same database as the test process. `TEST_ORIGIN` optionally changes the test target from `http://127.0.0.1:3000`; the server's `APP_ORIGIN` must match it. Restart the server after changing environment variables. For a production-server test, build first, start with `npm start`, and run tests from another terminal.

Tests cover registration validation, duplicate accounts, pending login rejection, origin checks, approval, password verification, session cookies, member/admin authorization, publishing, bookings, attendance, unpublishing, approval revocation, logout, public pages, and theme behavior. See `QA.md` for additional context.

## Pages and application interfaces

Public routes include `/`, `/about`, `/activities`, `/events`, `/news`, `/resources`, `/gallery`, `/contact`, and `/privacy`. Event and news detail routes use `/events/<content-id>` and `/news/<content-id>`.

Account routes include `/join`, `/sign-in`, `/membership-status`, `/forgot-password`, `/reset-password`, and `/verify-email`. The existence of the verification/recovery pages does not mean automated email delivery or email verification is configured.

Protected workspaces are `/member` and `/admin`. `/leader` currently opens the same administrator workspace and requires the administrator role; it is not a separate permission level.

The application uses three JSON endpoints:

- `/api/auth`: read the current user; register, log in, log out, and consume password-reset tokens.
- `/api/club`: read published content/statistics; submit contact messages and book events.
- `/api/admin`: read members/content/messages/attendance; approve or reject members, create content, change publication status, and mark attendance.

Mutation requests require an `Origin` header matching `APP_ORIGIN`; protected actions also require a valid session and appropriate database-backed role/status. These endpoints support the application UI, with no separately versioned external API contract.

## Project structure

```text
src/app/                 App Router pages, global styles, error states, API routes
src/app/[...slug]/       Public/account/workspace route dispatcher
src/components/          Public pages, account forms, workspaces, visual components
src/components/ui/       Reusable interface components
src/lib/server/          PostgreSQL pool, authentication, published content, statistics
src/lib/                 Shared models, date formatting, theme and utility code
scripts/schema.sql       Tables, historical totals, and compatibility SQL
scripts/                 Database setup, migration, recovery, and inspection helpers
tests/                   HTTP/database integration tests and theme tests
public/images/           Website images and source attribution
screenshots/             Design and manual review reference images
AGENT.MD / AGENTS.md      Repository instructions for coding agents
QA.md                    Validation notes
```

`users` stores membership and roles; `sessions` and `password_tokens` store hashed tokens; `content` holds the seven content types; `attendance` connects users to events; `messages` stores enquiries; `login_limits` tracks rate limits; `audit_log` records administrator membership, publishing, and attendance changes; `reported_totals` stores historical aggregates.

The schema script uses `CREATE TABLE IF NOT EXISTS` and a targeted compatibility change. It is not a full versioned migration system: future schema changes need explicit, reviewed SQL and a backup/rollback plan.

## Password recovery and security behavior

Automated recovery emails and SMTP are not configured. An operator with database access can run:

```sh
node scripts/reset-password.mjs user@example.com
```

The script writes a one-time link to `.local/password-reset.txt`, using `APP_ORIGIN`. The link expires after one hour and replaces previous reset tokens for that account. Privately deliver it after verifying the account owner's identity, then delete the file. Consuming a reset token invalidates existing sessions.

Passwords use salted scrypt hashes. Sessions use random opaque tokens in HTTP-only, SameSite=Lax cookies; PostgreSQL stores their SHA-256 hashes. Sessions expire after seven days. Cookies are marked Secure when `APP_ORIGIN` starts with `https://`. Protected requests check the user's current role and approval in PostgreSQL. Account requests and contact submissions have database-backed rate limiting. Only the display theme uses localStorage.

## Production deployment and handover

1. Provision a Node-capable host and a persistent PostgreSQL database. Static file hosting alone cannot run this application.
2. Set the production `DATABASE_URL` and exact HTTPS `APP_ORIGIN`. Configure database TLS according to the database provider's connection requirements.
3. For the current operator scripts, supply a protected `.env.local` on the machine where they run: those scripts explicitly load that file. The Next.js server can use environment variables supplied by the host.
4. Review the bootstrap administrator email and historical figures, back up any existing database, and run `node scripts/migrate.mjs` against the intended deployment database.
5. Run `npm ci`, `npm run build`, and `npm start`. The start command binds to loopback; a same-host reverse proxy can forward HTTPS traffic to it. Container or managed hosting that requires another interface must override the launch command, for example `npx next start --hostname 0.0.0.0 --port 3000`.
6. Configure the domain, HTTPS, process restarts, and logs. Preserve the request origin and configure trusted forwarding headers appropriately for IP-based rate limits.
7. Generate the administrator's password link using the reset script and the deployed origin. Complete setup privately.
8. Verify public pages, administrator login, membership approval, contact messages, publishing, booking, and attendance with controlled records. Do not run the integration suite against production.
9. Hand over hosting/domain access, database backup and restore procedures, administrator ownership, and the private recovery process to the responsible operator.

External images/resources remain dependent on their HTTPS hosts. The application currently accepts URLs rather than uploading media to managed storage. Confirm link availability and usage rights before publishing.

### Backups and maintenance

Schedule PostgreSQL backups separately from GitHub pushes, retain them securely, and test restoration on a separate database. A typical custom-format backup and restore uses PostgreSQL client tools:

```sh
pg_dump -h DB_HOST -U DB_USER -d DB_NAME -Fc -f cyberclubdit-backup.dump
pg_restore -h RESTORE_HOST -U RESTORE_USER -d EMPTY_RESTORE_DB --no-owner --no-acl cyberclubdit-backup.dump
```

Use protected password prompts or the database provider's secret handling. Store backups outside the repository. Preserve hosting configuration and secrets in a secure operator-controlled location. Monitor database availability, application errors, storage usage, and backup success. Plan retention/cleanup for expired sessions, reset tokens, and rate-limit records; no scheduled cleanup job is included.

### Current limitations

- Email verification and automated email notifications/recovery are not configured.
- Media upload/storage, payments, and certificate generation are not implemented.
- Content administration currently creates entries and toggles publication; the API has no general edit/delete operation for existing content.
- Historical totals require developer/database maintenance; they have no administrator editing interface.
- `/leader` is an administrator alias, not a distinct role.
- Database migrations, scheduled backups, monitoring, and data-retention jobs require operator setup.

## Troubleshooting

- **Database connection refused or authentication failed:** check PostgreSQL is running, the role/database exist, the connection string is correct, and network/database TLS settings match the host. Do not share the full connection string in an issue.
- **Missing table/relation:** run migration against the same database the server uses.
- **Form submissions fail with origin errors:** match the browser URL to `APP_ORIGIN` exactly and restart the server after updating configuration.
- **Pending account cannot sign in:** an approved administrator must approve it first.
- **Setup/reset link expired:** issue a fresh link with the reset script. Use the latest token and the correct environment/domain.
- **Too many attempts:** allow the 15-minute account rate-limit window to pass.
- **Tests cannot connect:** start the local application, verify the port/`TEST_ORIGIN`, and ensure both processes use the test database.
- **Secure cookie does not work locally:** use HTTP with the local HTTP origin; production HTTPS must use an HTTPS origin.
- **No content appears:** create and publish entries in `/admin`. Drafts are hidden from public queries.

## Contributing and source control

Keep changes focused, describe their purpose, and validate behavior before committing. For backend changes, run the production build and full test suite against a nonproduction database. For documentation-only changes, check instructions against the implementation and review the diff.

Before changing Next.js code, read the relevant bundled documentation under `node_modules/next/dist/docs/`, as required by `AGENTS.md`. Follow `AGENT.MD` for data, authentication, and visual conventions.

Commit and push completed changes to this repository. The default branch is `main`; use a feature branch and pull request when collaborating or when branch protection requires it. Never commit `.env.local`, `.local/`, credentials, private reset links, database dumps, `node_modules/`, or `.next/`. The current ignore rules cover local environment files, private setup files, dependencies, and build output.

No license file is currently included. Confirm permitted reuse and distribution with the repository owner.

The student workspace shares published events (including past recaps), news, and Learning materials with the public website. Gallery and community profiles remain on the public website; the student overview focuses on one practice lab, the next or latest event, and a news shortcut. Its Learning section uses the same six interactive demo labs. Admin navigation groups people, publishing, and communication; application lists can be filtered by approval status. Login and registration use different summit photos in the same left-aligned panel layout.

Admin reports are available at `/admin/analytics` and `/admin/audit`. Analytics uses platform records for membership, content publishing, event registration, and recorded attendance; it does not estimate website traffic or reuse historical marketing totals. Audit logs show administrator approvals/rejections, new content, publishing changes, and attendance changes. Writes and their audit entries commit together. History is read-only in the app, filtered on the server, and paginated in batches of 25. Older records may only contain membership reviews. Both reports require an approved administrator session.
