# Allo Inventory — Take-Home Exercise

A multi-warehouse inventory reservation system built with Next.js 14, Prisma, PostgreSQL, and TypeScript.

## Live Demo

> **[https://allo-inventory.vercel.app](https://allo-inventory.vercel.app)**  
> Seed data is pre-loaded. Some SKUs are intentionally scarce (1–3 units) to make the race-condition protection easy to test.

---

## Running Locally

### 1. Prerequisites

- Node.js 18+
- A hosted PostgreSQL instance (Supabase, Neon, or Railway all have free tiers)
- Optional: Upstash Redis (for the idempotency bonus)

### 2. Clone & install

```bash
git clone https://github.com/your-username/allo-inventory
cd allo-inventory
npm install
```

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Full URL of the app (used in SSR fetches) |
| `UPSTASH_REDIS_REST_URL` | ⬜ | Upstash Redis URL (idempotency bonus) |
| `UPSTASH_REDIS_REST_TOKEN` | ⬜ | Upstash Redis token |
| `CRON_SECRET` | ⬜ | Protects the cron endpoint in production |

### 4. Database setup

```bash
# Push schema to your Postgres instance
npm run db:push

# Seed with products, warehouses, and stock
npm run db:seed
```

### 5. Start

```bash
npm run dev
# → http://localhost:3000
```

---

## How the Concurrency Safety Works

This is the core of the exercise. The problem: two simultaneous `POST /api/reservations` requests for the last unit of a SKU must result in exactly one 201 and one 409.

### Solution: `SELECT ... FOR UPDATE` inside a Postgres transaction

```sql
-- Inside prisma.$transaction(async (tx) => { ... })
SELECT id, total, reserved
FROM "Stock"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE
```

`FOR UPDATE` acquires a **row-level exclusive lock** on that stock row. Any concurrent transaction that tries to lock the same row will **block** (not fail) until the first transaction commits or rolls back. This means:

1. Request A and Request B both arrive for the last unit.
2. One of them (say A) acquires the lock first.
3. B blocks at the `SELECT FOR UPDATE` line.
4. A checks: `available = total - reserved = 1 ≥ 1` ✅, increments `reserved`, commits.
5. B unblocks, re-reads: `available = total - reserved = 0 < 1` ❌, throws `INSUFFICIENT_STOCK`.
6. B's transaction rolls back automatically.
7. A returns 201, B returns 409.

No optimistic concurrency retry loops. No application-level mutexes. No Redis locks needed. The database does the right thing.

The same pattern is applied to `confirm` and `release` to prevent double-confirms and double-releases.

---

## How Reservation Expiry Works

Reservations have an `expiresAt` timestamp (10 minutes after creation). Two mechanisms ensure expired reservations are cleaned up and stock is returned:

### 1. Lazy cleanup on read (always active)

Every `GET /api/products` call runs `releaseExpiredReservations()` before computing available stock. This means:

- If a user is browsing products, they always see up-to-date availability.
- No background process is needed for correctness — the data is consistent on every read.
- Cost: one extra `SELECT` + potential `UPDATE`s on each product list request. Acceptable for this scale.

### 2. Vercel Cron job (production safety net)

`vercel.json` schedules `GET /api/cron/release-expired` to run every minute. This ensures expiry happens promptly even if no one is browsing, and prevents the `reserved` count from drifting if the product page isn't hit.

The cron endpoint is protected by a `CRON_SECRET` environment variable (Vercel passes it as `Authorization: Bearer <secret>`).

**Why not a database trigger?** A Postgres trigger could release expired reservations automatically, but it would complicate the Prisma setup and make the logic harder to test. The lazy + cron combination is simple, observable, and correct.

---

## Idempotency (Bonus)

The `POST /api/reservations` and `POST /api/reservations/:id/confirm` endpoints support the `Idempotency-Key` header.

### How it works

1. Client sends a request with `Idempotency-Key: <uuid>`.
2. Server checks the `IdempotencyRecord` table for a record matching `{endpoint}:{key}`.
3. **If found and not expired:** return the cached response body + status code immediately. The header `X-Idempotent-Replayed: true` is set so the client knows it was a replay.
4. **If not found:** run the handler, save `{ key, endpoint, responseBody, statusCode, expiresAt }` to the DB, return the response.
5. Records expire after 24 hours (configurable).

### Race between two identical keys

If two requests with the same key arrive simultaneously (before either has written the record), they both proceed to the handler. One will write the record; the other will hit a unique-constraint violation on the DB write. The constraint violation is caught and swallowed — the second request returns its own response, which will be identical anyway since both executed against the same pre-state.

This is an acceptable trade-off: the idempotency guarantee holds for retries after the first response has been received. True "exactly-once" across simultaneous duplicates would require a distributed lock, which adds complexity not warranted here.

---

## API Reference

| Method | Path | Status codes |
|---|---|---|
| `GET` | `/api/products` | 200 |
| `GET` | `/api/warehouses` | 200 |
| `POST` | `/api/reservations` | 201, 400, 404, 409 |
| `GET` | `/api/reservations/:id` | 200, 404 |
| `POST` | `/api/reservations/:id/confirm` | 200, 404, 409, 410 |
| `POST` | `/api/reservations/:id/release` | 200, 404, 409 |
| `GET` | `/api/cron/release-expired` | 200, 401 |

**409** on `/api/reservations` = not enough stock available  
**410** on `/api/reservations/:id/confirm` = reservation has expired  

---

## Trade-offs & What I'd Do Differently

### What's here
- Full end-to-end implementation of the spec
- Race-condition-free reservation with `SELECT FOR UPDATE`
- Dual expiry mechanism (lazy + cron)
- Idempotency via Postgres (no Redis required)
- TypeScript end-to-end with Zod validation
- Error states surfaced in the UI (409, 410)
- Live countdown with visual urgency on the checkout page

### What I'd add with more time

1. **Auth**: Right now any client can confirm/release any reservation by ID. In production, reservations would be tied to a user session and the confirm/release endpoints would verify ownership.

2. **Optimistic UI / polling on the checkout page**: The checkout page doesn't poll for external state changes (e.g. if an admin releases the reservation from another session). Adding a short `setInterval` to re-fetch the reservation status would make this more robust.

3. **Better idempotency under true concurrency**: The current approach can let two simultaneous identical requests both execute. A Redis `SET NX EX` lock would prevent this entirely — the second request would block until the first has committed.

4. **Webhook / event system**: In a real payment flow, you'd want the payment provider to call back via webhook to confirm payment success rather than the frontend calling `/confirm`. This changes the architecture significantly.

5. **Database indexes**: `Stock(productId, warehouseId)` already has a unique index from Prisma. I'd add an index on `Reservation(status, expiresAt)` to make the cron cleanup query fast at scale.

6. **Proper error boundaries and loading skeletons in the UI**.

7. **E2E tests** (Playwright) for the concurrent reservation scenario — spawn two `fetch` calls simultaneously and assert exactly one 409.
