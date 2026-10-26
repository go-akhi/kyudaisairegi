# Stall Console

Cash-only ordering for a multi-stall university festival. One shared account per
stall; each device chooses to be **storefront** (takes orders, hands them over,
manages the menu) or **back of store** (works the queue, marks orders ready).
Customers get a read-only menu via QR — no ordering, no accounts, no payments.

Next.js 16 · Postgres · Drizzle · Tailwind · self-hosted on the homelab.

## Routes

| Route | Who | What |
|---|---|---|
| `/` | public | Landing page — what prospective stall owners see |
| `/stalls` | public | Festival index of stalls |
| `/s/[slug]` | public | Stall menu, prices, sale, sold-out state |
| `/login` | staff | Shared stall account or admin |
| `/mode` | staff | Pick front/back + device name for this device |
| `/counter` | front | Build an order, place it, hand over ready orders |
| `/manage` | front | Items, photos, prices, categories, sale, open/closed, QR |
| `/queue` | back | Prep queue with ticket age, mark ready |
| `/admin` | admin | Create stalls, reset passwords, today's takings |
| `/api/queue` | staff | Polled every 3s by front and back |

## Local development

```bash
cp .env.example .env          # then edit
docker compose up -d db
pnpm install
pnpm db:migrate               # create tables
pnpm seed                     # creates the admin from .env
pnpm dev                      # http://localhost:3000
```

Demo data (two stalls' worth of menu, plus test sessions) is optional:

```bash
node --env-file=.env scripts/dev-seed.mjs
# stall login: takoyaki / takoyaki123
```

Browser smoke test of the full front → back → handover loop:

```bash
pnpm dev          # in one terminal
pnpm e2e          # in another (uses the dev seed + /usr/bin/google-chrome)
```

## Language

English and Japanese, switchable from the header of every page (staff screens
and public menu alike). The choice lives in the `kd_locale` cookie; without one
the browser's `Accept-Language` decides, so a Japanese phone opening the QR
lands on Japanese already. URLs never change — QR codes keep working.

Only the app chrome is translated. Stall-typed content (item names,
descriptions, notes) is shown exactly as the owner wrote it.

## Deploy (homelab + Cloudflare Tunnel)

1. Point `kyudaisai.<your-domain>` at the tunnel in the Cloudflare dashboard.
2. On the box, create a `.env` next to `docker-compose.yml`:

   ```env
   POSTGRES_PASSWORD=<long random>
   APP_URL=https://kyudaisai.<your-domain>
   TUNNEL_TOKEN=<from the Cloudflare tunnel>
   ```

3. ```bash
   docker compose up -d --build
   docker compose exec app node -e "1"      # sanity: container is alive
   docker compose run --rm app node --env-file=.env scripts/seed.mjs
   ```

   Migrations run against the host, not the container:

   ```bash
   DATABASE_URL=postgres://kyudaisai:<pw>@127.0.0.1:5432/kyudaisai pnpm db:migrate
   ```

4. `APP_URL` must be the public HTTPS origin **before you print any QR code** —
   the QR encodes it. Cookies are `Secure` in production, so plain-HTTP access
   will silently refuse to log in.

Optional: a Cloudflare cache rule for `kyudaisai.<domain>/s/*` with a 30-second
edge TTL keeps menus loading if the homelab blips. Do not cache `/counter`,
`/queue`, `/admin`, or `/api/*`.

Back up nightly:

```bash
docker compose exec -T db pg_dump -U kyudaisai kyudaisai | gzip > backup-$(date +%F).sql.gz
```

## Design decisions worth keeping

- **Discounts are frozen on the order.** `orders.discount_pct/yen` are written at
  creation; changing the sale never rewrites a ticket that is already in the
  queue. Discounts are computed per line and summed so the ticket always adds up.
- **Prices are recomputed server-side** from the database on every order. The
  client only sends item ids, quantities and option ids.
- **Money is integer yen** everywhere. No floats, no cents.
- **Mode lives in a cookie per device**, not in the session, so a reboot never
  lands on a mode picker during a rush.
- **`device_label`** is stamped on every order and event. With shared credentials
  it is the only attribution you have.
- **Polling, not websockets.** 3 seconds, one endpoint, no extra process.
- **Order numbers are per stall, per JST day**, allocated with an atomic upsert —
  two tablets cannot produce the same number.
- **Add-ons keep the customer's number.** A second batch is its own order row with
  `addon_no` and `parent_order_id`, so the kitchen gets a separate ticket. Every
  ticket in the group is marked `1/2`, `2/2`… on the kitchen and handover screens.
  It inherits the parent's frozen discount and does not consume a new number.
- **Status is a three-state machine** (`placed → ready → completed`, plus
  `cancelled`) with guarded updates, so a double-tap cannot skip a step.

## Not built (deliberately)

Metabase (planned: read-only role + reporting views + a separate hostname behind
Cloudflare Access), CSV export, and a dedicated daily-report page. Add the CSV
export first — it answers most questions with far less machinery.
