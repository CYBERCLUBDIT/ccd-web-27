# Cyber Club DIT

Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, Motion, and PostgreSQL 18.

## Local operation

`npm run dev` serves http://127.0.0.1:3000. The ignored `.env.local` supplies `DATABASE_URL` and `APP_ORIGIN`.

`node scripts/migrate.mjs` creates missing tables and provisions the initial administrator. It does not seed sample content. Initial administrator: ezekielezekiel003@gmail.com. The private one-time password setup link is saved to `.local/admin-setup.txt` and expires after 24 hours. Open it and choose a password; then sign in to access `/admin`.

Registration stores student details and a salted scrypt password hash. New accounts are pending. Login and every portal/API request check database approval and role. HTTP-only SameSite cookies carry opaque session tokens; only hashed tokens are stored. Mutations check the configured origin, and login/registration are rate limited in PostgreSQL. Configure an HTTPS APP_ORIGIN before deploying so cookies are marked Secure.

Admin content supports events, news, resources, gallery images, CTF challenges, leaders, and testimonials. Only published records appear publicly. Gallery and leader images use administrator-supplied HTTPS URLs. Existing stock imagery is decorative website photography, not a record of a club event.

Counters are derived from approved memberships, published completed events, and checked-in attendance. Owner-supplied historical aggregate totals are retained in reported_totals. Public figures show the larger of reported totals and recorded activity, without inventing member or event records. Browser-local applications were not imported: old browser data cannot prove account ownership, and plaintext passwords were never collected.

Password recovery emails are not configured. Administrators can issue a private reset link with `node scripts/reset-password.mjs user@example.com`, delivered manually to the verified account owner. No passwords are written to disk.

Run `npm run build` and `npm test`. Tests create uniquely named temporary records and remove only those records afterward. Never run tests against a production database.

# ccd-web-27
