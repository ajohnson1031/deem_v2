# Deem v2

Deem is a monorepo for a mobile-first gift card conversion app that allows users to:

- Add a gift card
- Check the available balance
- Generate a quote
- Convert the card balance into XRP
- Link a bank account if needed
- Continue payout flow
- View status updates and a final receipt

The repository uses **npm workspaces** and contains two main applications:

- `backend/` — Fastify API + Prisma + BullMQ workers
- `mobile/` — Expo Router mobile application

---

# Repository Structure

```
deem2/
  backend/
  mobile/
  package.json
  README.md
```

## Backend

The backend is responsible for:

- Authentication
- Quote generation
- Conversion creation
- Payout orchestration
- Bank linking
- Queue processing
- Watchdog / recovery behavior
- Admin queue utilities

## Mobile

The mobile application is responsible for:

- Authentication flow
- Home dashboard
- Add card flow
- Quote confirmation
- Conversion status polling
- Bank linking flow
- Receipt view

---

# Tech Stack

## Backend

- Fastify
- Prisma
- PostgreSQL
- BullMQ
- Redis
- TypeScript

## Mobile

- Expo
- Expo Router
- React Native
- TypeScript

## Tooling

- npm workspaces
- ESLint
- Prettier
- Husky
- lint-staged

---

# Workspace Commands

Run these from the **repo root**.

## Install dependencies

```bash
npm install
```

## Run the full application

```bash
npm run dev
```

This starts:

- Backend API
- Backend workers
- Expo mobile app

---

# Formatting

Format the repository:

```bash
npm run format
```

Check formatting:

```bash
npm run format:check
```

---

# Linting

Lint the entire monorepo:

```bash
npm run lint
```

Lint backend only:

```bash
npm run lint -w backend
```

Lint mobile only:

```bash
npm run lint -w mobile
```

---

# Root Scripts

The root workspace should contain scripts similar to:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev -w backend\" \"npm run dev -w mobile\"",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "lint": "npm run lint -w backend && npm run lint -w mobile"
  }
}
```

---

# Backend

## Running Backend

From the repo root:

```bash
npm run dev -w backend
```

Or inside the backend folder:

```bash
npm run dev
```

Expected backend behavior:

- API runs on `http://127.0.0.1:4000`
- Worker runs alongside API
- Watchdog / recovery logic active
- Prisma client generated
- Environment variables loaded

---

# Backend Environment

Backend requires environment variables for:

- `DATABASE_URL`
- Redis connection
- Provider configuration
- Mock/sandbox settings
- Authentication settings
- Admin controls

Ensure `.env` exists in the backend directory before running the server.

---

# Backend Routes

## Auth

```
POST /auth/start
POST /auth/verify
```

## Wallet

```
GET /balance
GET /activity
```

## Gift Cards

```
POST /gift-cards
POST /gift-cards/:id/balance
```

## Quotes and Conversions

```
POST /quotes
POST /conversions
GET /conversions/:id
GET /conversions/:id/timeline
```

## Bank / Payouts

```
POST /bank/link/start
POST /bank/link/complete
GET /bank/accounts
POST /payouts
```

## Admin / Queue

Admin routes allow:

- queue metrics
- stuck conversion inspection
- requeue / fail operations

---

# Conversion Lifecycle

Typical backend lifecycle:

1. User creates quote
2. App creates conversion using `quoteId`
3. Conversion is queued
4. Worker processes conversion steps
5. Timeline events recorded
6. If payout requires a bank, conversion pauses
7. User links bank
8. Payout continues
9. Conversion reaches terminal state
10. Mobile shows final receipt

---

# Mobile

## Running Mobile

From repo root:

```bash
npm run dev -w mobile
```

Or inside the mobile folder:

```bash
npm run dev
```

Expo Router is used for navigation.

---

# Mobile API Base URL

The mobile app automatically selects the API base URL depending on platform:

| Device           | URL                     |
| ---------------- | ----------------------- |
| iOS Simulator    | `http://localhost:4000` |
| Android Emulator | `http://10.0.2.2:4000`  |
| Physical Phone   | `http://<LAN_IP>:4000`  |

Example:

```
http://192.168.1.78:4000
```

If the mobile app cannot reach the backend, check this value first.

---

# Mobile App Flow

Primary user journey:

1. Sign in
2. Home loads
3. Tap **Add Card**
4. Create gift card
5. Check balance
6. Navigate to **Quote Confirm**
7. Generate quote
8. Confirm conversion
9. Navigate to **Conversion Status**
10. Link bank if required
11. Continue payout
12. View **Receipt**
13. Return home
14. Activity deep-links back to conversion

---

# Mobile Folder Structure

```
mobile/src/
  api/
  components/
  features/
    activity/
    conversions/
    giftCards/
    quotes/
  hooks/
  lib/
  state/
```

### `src/api`

Endpoint-specific API helpers.

Examples:

- activity
- banks
- conversions
- gift cards
- quotes
- wallet

### `src/components`

Reusable UI primitives:

- ScreenHeader
- SectionCard
- PrimaryButton
- SecondaryAction

### `src/features`

Feature-specific logic and helpers:

- activity formatting/components
- conversion formatting/progress UI
- gift card helpers
- quote formatting helpers

### `src/lib`

Shared utilities:

- API fetch wrapper
- shared contracts
- shared formatting helpers
- error translation

### `src/hooks`

Reusable hooks:

- conversion timeline polling

### `src/state`

Auth state and token persistence.

---

# Shared Contracts

API response types are centralized in:

```
mobile/src/lib/contracts.ts
```

This defines DTO-style interfaces for:

- wallet balance
- activity items
- gift card responses
- quote responses
- conversions
- bank accounts
- timeline responses

---

# Error Handling

Mobile error messages are translated from backend codes in:

```
mobile/src/lib/errors.ts
```

Examples:

- `QUOTE_NOT_FOUND`
- `QUOTE_EXPIRED`
- `KYC_REQUIRED`
- `LIMIT_DAILY_EXCEEDED`
- `LIMIT_WEEKLY_EXCEEDED`
- `BANK_ACCOUNT_NOT_FOUND`

---

# Formatting and Linting

The repository uses:

- **Prettier** for formatting
- **ESLint** for linting
- **Husky + lint-staged** for Git hooks

### Pre-commit

Runs checks on staged files.

### Pre-push

Optional hook can run:

```bash
npm run format:check && npm run lint
```

---

# Recommended Developer Workflow

1. Pull latest changes
2. Install dependencies
3. Start backend and mobile
4. Make changes
5. Run format
6. Run lint
7. Verify the main app flow
8. Commit
9. Push

---

# Manual Verification Checklist

Before merging major changes:

- Auth works
- Home loads balance + activity
- Add card works
- Balance check works
- Quote screen receives amount
- Quote creation works
- Conversion creation works
- Conversion status updates
- Bank linking works
- Receipt loads correctly
- Activity deep-links function

---

# Troubleshooting

## Prettier permission issues

```bash
chmod +x node_modules/.bin/prettier
```

## Prisma generate failure

Check imports inside:

```
backend/prisma.config.ts
```

Ensure environment bootstrap path is correct.

## Mobile cannot reach backend

Verify API base URL and confirm backend is reachable from the device.

---

# Project Status

The project currently includes:

- shared API contracts
- modular mobile feature structure
- centralized format helpers
- centralized error translation
- git hooks for linting and formatting

Future improvements may include:

- automated tests
- CI pipeline
- improved backend typing
- additional documentation for workers and queue lifecycle

---

# Notes

This repository is under active development.  
Backend processing capabilities currently exceed UI coverage in some areas, and the mobile interface is being incrementally aligned with backend contracts.

The current focus is:

- end-to-end happy path stability
- refactoring shared logic
- improving maintainability
