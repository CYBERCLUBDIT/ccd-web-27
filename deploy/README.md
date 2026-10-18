# Current VPS deployment

The application runs on `93.127.142.206` at `/var/www/ccd-web`, with Supabase PostgreSQL. Existing unrelated applications continue to use their existing Caddy container. Do not enable Nginx on ports 80/443: Caddy already owns them.

Build on the VPS with `npm ci && npm run build`, then start the service:

```sh
docker compose -p ccd-web -f deploy/vps.compose.yml up -d
docker compose -p ccd-web -f deploy/vps.compose.yml logs --tail=100
curl http://127.0.0.1:3100/api/club
```

The compose file uses the existing external network `fikaai-production_private` and UID/GID 1000. Adjust these for other hosts. The Node image is pinned to the digest verified during deployment. The application port is exposed only on host loopback; Caddy reaches `cyberclubdit-web:3000` over the Docker network.

Private configuration is in `.env.vps-production` (mode 600), containing `DATABASE_URL` and `APP_ORIGIN=https://cyberclubdit.org`. It overrides Next.js's local environment values at runtime. The Supabase CA certificate is in `.local/supabase-ca.crt` and is loaded using `NODE_EXTRA_CA_CERTS`; database connections use `sslmode=verify-full`. This persistent VPS uses the Supabase shared session pooler on port 5432. Do not commit credentials or private setup links.

The dedicated `ccd_vps_runtime` database role has explicit application table privileges and role-specific RLS policies. It has no superuser, database creation, role creation, or RLS bypass privileges. Public Supabase API roles have no policies granting application data access. The runtime role is not intended to run schema migrations; use the privileged Supabase migration workflow for schema changes.

Append the supplied `cyberclubdit.Caddyfile` blocks once to `/opt/fikaai/deploy/Caddyfile`, preserving its other sites. Back up that file before editing. Validate and gracefully reload with:

```sh
docker exec fikaai-production-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec fikaai-production-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Point the domain's root A record to `93.127.142.206`, with `www` as a CNAME to `cyberclubdit.org`. Remove conflicting web A/AAAA records while preserving mail-related MX/TXT records. Caddy automatically obtains HTTPS certificates once DNS resolves to this VPS and ports 80/443 are reachable.

Verify the actual HTTPS domain, public content API, sign-in, and administrator authorization after DNS changes. The loopback health check alone does not confirm public HTTPS is live. Do not run the integration suite against production.

For updates, back up the database, pull reviewed commits, rebuild, and recreate the container. Keep a copy of the previous build for rollback. Build while serving the same `.next` directory can interrupt requests; stop this container during an in-place build or move to separate release directories before requiring zero-downtime releases. Docker's restart policy brings the service back after host restarts. Restoring the saved Caddy configuration and reloading removes the new routes if rollback is needed.


## Release directories (current production)

Production runs from a separate directory under `/var/www/ccd-web/.local/releases/`, built before container replacement. `/var/www/ccd-web/.local/active-release.txt` records the active directory and is the source of truth for the serving release. The parent checkout is retained for recovery and is not the serving source directory.

Use the active release when reading logs or restarting; simply pulling into the parent checkout does not update the serving release:

```sh
active_release=$(cat /var/www/ccd-web/.local/active-release.txt)
docker compose -p ccd-web -f "$active_release/deploy/vps.compose.yml" logs --tail=100
docker compose -p ccd-web -f "$active_release/deploy/vps.compose.yml" up -d
```

For the next release, archive the reviewed commit into a new directory under `.local/releases/`, copy the private environment file and CA into that release, install locked dependencies, and build there. Check a temporary container on a separate loopback port before recreating only the `ccd-web` project's `web` service. Keep the previous directory and its compose file for rollback. The summit seed inserts nine photos, one past event, and one news story; it preserves existing records on reruns. All other hosted projects keep their own compose projects and containers.
