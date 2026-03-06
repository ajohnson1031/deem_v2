# Deem Backend

The Deem backend powers the gift card conversion platform.

It is responsible for:

- authentication
- quote generation
- conversion orchestration
- payout execution
- bank account linking
- activity feed generation
- queue processing
- watchdog recovery

The backend is built using **Fastify**, **Prisma**, and **BullMQ**.

---

# Tech Stack

- Node.js
- Fastify
- Prisma
- PostgreSQL
- BullMQ
- Redis
- TypeScript

---

# Project Structure

```
backend/
  prisma/
  src/
    db/
    lib/
    modules/
    plugins/
    policy/
    providers/
    queues/
    workers/
    server.ts
    worker.ts
  prisma.config.ts
  package.json
```

---

# Core Components

## API Server

`src/server.ts`

Responsible for:

- bootstrapping Fastify
- registering plugins
- loading modules
- global error handling
- authentication middleware

---

## Worker

`src/worker.ts`

Responsible for:

- processing queued conversion jobs
- executing conversion state transitions
- calling provider integrations
- recording timeline events

---

## Watchdog Worker

Located in:

```
src/workers/watchdogWorker.ts
```

Responsible for:

- detecting stuck conversions
- retrying jobs
- recovering failed processing states

---

# Modules

API routes are organized by domain.

```
src/modules/
```

Examples:

## Auth

```
src/modules/auth/
```

Routes:

```
POST /auth/start
POST /auth/verify
```

---

## Wallet

```
src/modules/balance/
```

Routes:

```
GET /balance
```

---

## Activity

```
src/modules/activity/
```

Routes:

```
GET /activity
```

Provides the mobile activity feed.

---

## Gift Cards

```
src/modules/giftcards/
```

Routes:

```
POST /gift-cards
POST /gift-cards/:id/balance
```

Handles gift card creation and balance retrieval.

---

## Quotes

```
src/modules/quotes/
```

Routes:

```
POST /quotes
```

Generates a quote for converting gift card balance.

---

## Conversions

```
src/modules/conversions/
```

Routes:

```
POST /conversions
GET /conversions/:id
GET /conversions/:id/timeline
```

Handles the main conversion lifecycle.

---

## Bank Accounts

```
src/modules/bank/
```

Routes:

```
POST /bank/link/start
POST /bank/link/complete
GET /bank/accounts
```

Handles bank account linking.

---

## Payouts

```
src/modules/payouts/
```

Routes:

```
POST /payouts
```

Completes payout to linked bank account.

---

## Limits

```
src/modules/limits/
```

Enforces:

- daily limits
- weekly limits
- KYC requirements

---

## Admin

```
src/modules/admin/
```

Routes for debugging and operational visibility.

Examples:

- queue metrics
- stuck conversions
- manual requeue

---

# Queues

Queue configuration lives in:

```
src/queues/
```

Example:

```
conversionQueue.ts
```

Responsible for processing conversion jobs.

---

# Conversion Lifecycle

A typical conversion follows this flow:

1. User creates a quote
2. Mobile app confirms conversion
3. Backend creates conversion record
4. Conversion job is queued
5. Worker processes conversion steps
6. Timeline events recorded
7. If bank required, conversion pauses
8. User links bank
9. Payout resumes
10. Conversion completes

---

# Timeline Events

Every conversion records events in:

```
conversion_events
```

Examples:

- STATUS_CHANGED
- STEP_DONE_PURCHASE
- STEP_DONE_PAYOUT
- PROVIDER_CALL
- BANK_ATTACHED
- FAILED

These events power the mobile **conversion timeline UI**.

---

# Providers

Provider integrations live in:

```
src/providers/
```

Examples:

- mock provider
- sandbox provider

Provider selection is environment driven.

---

# Database

Database access uses Prisma.

Location:

```
prisma/schema.prisma
```

Common models include:

- users
- quotes
- conversions
- conversion_events
- bank_accounts
- gift_cards

---

# Environment Variables

The backend requires environment variables such as:

```
DATABASE_URL
REDIS_URL
PROVIDER_MODE
ADMIN_TOKEN
```

Ensure a `.env` file exists before running the server.

---

# Running the Backend

From the repo root:

```
npm run dev -w backend
```

Or from the backend directory:

```
npm run dev
```

The server runs on:

```
http://127.0.0.1:4000
```

---

# Worker

Run the worker alongside the API server:

```
npm run dev
```

The worker processes:

- conversion jobs
- payout jobs
- retry jobs

---

# Development Workflow

Typical backend development flow:

1. start API + worker
2. create quotes via mobile
3. create conversions
4. inspect timeline events
5. debug queue behavior
6. monitor stuck conversions

---

# Linting

Run lint:

```
npm run lint
```

Fix lint issues:

```
npm run lint:fix
```

---

# Formatting

Formatting is handled at the root workspace using Prettier.

```
npm run format
```

---

# Notes

The backend contains most of the business logic for Deem.

The mobile app acts primarily as a UI layer interacting with these APIs.

Future improvements may include:

- stronger typing for route handlers
- improved queue observability
- integration with real provider APIs
