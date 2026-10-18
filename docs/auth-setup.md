# Email confirmation, Google, and GitHub

The Supabase Auth integration is prepared behind `SUPABASE_AUTH_ENABLED`. Do not enable this switch on production until email delivery, providers, templates, and an administrator sign-in are configured and verified. The existing authentication continues to work while it is off.

## User journey

1. `/join` asks for email, password, and confirm password. Google and GitHub buttons appear below the email form.
2. Email accounts confirm their email; Google/GitHub accounts return through Supabase with a verified email. Unverified identities cannot create a club session.
3. Both enter `/complete-profile`: **About you** (full name and phone), then **Student details** (registration number and course).
4. Submitting those details opens the third step, **Application sent**, with: “Congratulations! Your application is sent. Please wait for approval.”
5. Only completed applications appear in the administrator's membership list. A verified identity does not grant membership approval or administrator privileges.

Supabase handles passwords, email confirmation, and social identity. The application keeps its revocable opaque HTTP-only club sessions and reads role/approval from PostgreSQL on every protected request. Supabase session tokens are not saved in localStorage. Temporary PKCE cookies are HTTP-only; password recovery uses a short-lived HTTP-only cookie. Removing a Supabase Auth user clears the linked identity and prevents that user from accessing club sessions while managed authentication is enabled.

## Supabase settings

Project: `umzmbslunpnbywzenohz` (`ccd-web-27`).

- Site URL: `https://cyberclubdit.org`
- Allowed redirect: `https://cyberclubdit.org/auth/**` (includes the SDK's PKCE flow query parameter).
- Confirm email: enabled.
- Anonymous sign-in: disabled.
- Google and GitHub: enable only after adding their provider credentials.

The site URL and redirect were saved, and email confirmation was checked during implementation. Provider credentials and Resend SMTP require owner setup.

Settings: https://supabase.com/dashboard/project/umzmbslunpnbywzenohz/auth/providers

## Google setup

Open https://console.cloud.google.com/auth/overview and select or create a project owned by the club.

1. Configure branding as **Cyber Club DIT**, with a support email controlled by the club, homepage `https://cyberclubdit.org`, and privacy URL `https://cyberclubdit.org/privacy`.
2. Choose the intended audience. While the app is in testing, add the accounts that will test sign-in. Publish the audience when ready for public use, completing any Google-required verification.
3. Create an OAuth client of type **Web application**.
4. Authorized JavaScript origin: `https://cyberclubdit.org`.
5. Authorized redirect URI: `https://umzmbslunpnbywzenohz.supabase.co/auth/v1/callback`.
6. In Supabase's Google provider settings, enter the Client ID and Client Secret, enable Google, and save. Keep nonce/security checks enabled.

Use only basic identity scopes (`openid`, email, profile). Google client secrets belong in Supabase, not in browser code or GitHub.

## GitHub setup

Open https://github.com/settings/applications/new (an **OAuth App**, not a GitHub App).

- Application name: **Cyber Club DIT**
- Homepage URL: `https://cyberclubdit.org`
- Authorization callback URL: `https://umzmbslunpnbywzenohz.supabase.co/auth/v1/callback`

Register the app and generate its Client Secret. Enter the Client ID and secret in Supabase's GitHub provider settings, enable GitHub, and save. The application requests only identity/email scopes, not repository access. Users need an available verified email on GitHub.

## Resend setup

Open https://resend.com/domains and add a sending domain owned by the club. Verify it by adding the exact DNS records Resend provides in Namecheap. Do not replace existing website A records or mail MX records with guessed values.

Once the domain is verified, create a sending API key and enter it directly in Supabase's **Authentication → Emails → SMTP Settings**:

- Sender name: **Cyber Club DIT**
- Sender address: an address on the verified domain, such as `no-reply@cyberclubdit.org` only if that exact domain is verified.
- SMTP host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: the Resend sending API key.

Save and send a controlled test email. Supabase's built-in sender is restricted to authorized team addresses and is not a replacement for production SMTP. The application itself does not need a Resend API key because Supabase sends these emails.

Official guide: https://resend.com/docs/send-with-supabase-smtp

### Email templates

After SMTP is configured, open **Authentication → Emails → Templates**.

Confirm sign-up subject: **Confirm your email**

```html
<h2>Welcome to Cyber Club DIT</h2>
<p>Confirm your email to finish your application.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
    >Confirm email</a
  >
</p>
<p>If you did not sign up, you can ignore this email.</p>
```

Reset-password subject: **Reset your password**

```html
<h2>Reset your password</h2>
<p>
  <a
    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
    >Choose a new password</a
  >
</p>
<p>If you did not request this, you can ignore this email.</p>
```

These token-hash links can be opened in another browser. The default PKCE templates require the browser that began the request.

## Application environment and rollout

The server needs these variables in its private `.env.vps-production`:

```dotenv
SUPABASE_AUTH_ENABLED=true
SUPABASE_URL=https://umzmbslunpnbywzenohz.supabase.co
SUPABASE_PUBLISHABLE_KEY=copy-the-project-publishable-key
APP_ORIGIN=https://cyberclubdit.org
```

Keep the existing `DATABASE_URL` and CA certificate configuration. Google/GitHub secrets and the Resend key stay in Supabase; no `service_role` key is needed by this integration.

Apply `scripts/supabase-auth.sql` through a privileged Supabase migration connection before deploying code that queries the identity column. It was applied during implementation. The portable `scripts/schema.sql` adds the column for local tests; only the Supabase-specific migration adds its foreign key to `auth.users`.

Existing club accounts are linked by email only after Supabase verifies ownership. Their database role and approval are preserved. Existing custom password hashes are not imported into Supabase: existing users must create a Supabase email account with the same email and confirm it, or sign in using a provider with that verified email. Do not delete their existing club records. Confirm that the club administrator can use one of these methods before enabling managed authentication. Old manual password-reset links apply only to the legacy authentication mode.

Recreate the VPS container after changing environment variables:

```sh
docker compose -p ccd-web -f deploy/vps.compose.yml up -d --force-recreate
```

Test an email signup through both onboarding steps, confirmation replay rejection, Google/GitHub callbacks, pending access denial, administrator approval, login after approval, password recovery, and logout. Use controlled accounts; never run the integration suite against production.

For local validation, build first and run `npm test` with the local development server running. The Supabase auth suite starts a separate local app and a mock identity service. It tests identity/approval boundaries and the user flow without sending emails or contacting real OAuth providers. Live provider sign-in and email delivery still need a final check with owner-controlled accounts after credentials are configured.
