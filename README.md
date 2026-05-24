# Inventory Reservation System

A multi-warehouse inventory reservation system built with Next.js, Prisma, PostgreSQL, and Supabase.

The application prevents overselling during checkout by temporarily reserving stock with concurrency-safe transactions and PostgreSQL row-level locking.

---

## Features

- Multi-warehouse inventory management
- Temporary stock reservations
- Concurrency-safe reservation handling
- Reservation expiry and automatic release
- Checkout countdown timer
- RESTful API architecture
- Idempotent API support
- Prisma + PostgreSQL integration
- Responsive UI with Tailwind CSS

---

## Tech Stack

- Next.js 14
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- Tailwind CSS
- Zod
- Redis (optional for idempotency)

---

## API Endpoints

### Products

```http
GET /api/products
````

Returns all products with warehouse stock availability.

---

### Warehouses

```http
GET /api/warehouses
```

Returns all warehouses.

---

### Create Reservation

```http
POST /api/reservations
```

Creates a temporary reservation for a product.

Returns:

* `201` on success
* `409` if stock is unavailable

---

### Confirm Reservation

```http
POST /api/reservations/:id/confirm
```

Confirms reservation after successful payment.

Returns:

* `200` on success
* `410` if reservation expired

---

### Release Reservation

```http
POST /api/reservations/:id/release
```

Releases reserved stock back to inventory.

---

## Local Setup

### 1. Clone Repository

```bash
git clone <repository-url>
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Configure Environment Variables

Create a `.env` file in the root directory.

```env
DATABASE_URL=your_supabase_database_url
```

---

### 4. Run Database Migrations

```bash
npx prisma migrate dev
```

---

### 5. Generate Prisma Client

```bash
npx prisma generate
```

---

### 6. Seed Database

```bash
npx tsx prisma/seed.ts
```

---

### 7. Start Development Server

```bash
npm run dev
```

---

## Concurrency Handling

The reservation system prevents overselling using PostgreSQL row-level locking with `SELECT ... FOR UPDATE` inside Prisma transactions.

When multiple users attempt to reserve the same product simultaneously:

1. The stock row is locked during the transaction
2. Concurrent requests wait until the lock is released
3. Available stock is recalculated safely
4. Only one request can reserve the final available unit

This guarantees race-condition-free inventory reservations.

---

## Reservation Expiry

Reservations automatically expire after 10 minutes if not confirmed.

Expired reservations are released automatically and reserved stock is restored back to available inventory.

---

## Idempotency

The reservation and confirmation endpoints support idempotency using request keys.

If the same request is retried with the same idempotency key:

* duplicate reservations are prevented
* the original response is returned safely

---

## Database Design

The system includes the following models:

* Product
* Warehouse
* Stock
* Reservation
* IdempotencyRecord

Reservations maintain:

* reservation status
* expiry time
* quantity
* warehouse mapping

Stock tracks:

* total inventory
* reserved inventory
* available inventory

Available stock formula:

```txt
available = total - reserved
```

---

## Tradeoffs

* PostgreSQL row-level locking was chosen over distributed locking for simplicity and reliability
* Reservation expiry is handled through backend cleanup logic
* Redis is used only for idempotency support
* Focus was placed on correctness and concurrency safety rather than advanced UI polish

---

## Deployment

Frontend deployed on Vercel.

Database hosted on Supabase.

---

## Future Improvements

* Add authentication
* Add admin dashboard
* Add warehouse analytics
* Improve reservation monitoring
* Add websocket-based real-time stock updates

---

## Author

Imran Basha
