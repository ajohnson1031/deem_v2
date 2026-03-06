# Deem Mobile App

The mobile app provides the user interface for Deem.

It allows users to:

- sign in
- add gift cards
- check balances
- generate conversion quotes
- convert gift card balances into XRP
- link a bank account
- monitor conversion progress
- view receipts

The mobile app is built with **Expo Router** and **React Native**.

---

# Tech Stack

- React Native
- Expo
- Expo Router
- TypeScript

---

# Project Structure

```
mobile/
  app/
  src/
    api/
    components/
    features/
    hooks/
    lib/
    state/
  package.json
```

---

# Routing

Routing is handled using **Expo Router**.

```
app/
```

Examples:

```
(app)/
  index.tsx
  add-card.tsx
  quote-confirm.tsx
  conversions/[id].tsx
  receipt/[id].tsx
  bank/link.tsx
```

---

# App Flow

Typical user flow:

1. Sign in
2. Land on Home
3. Tap Add Card
4. Enter card details
5. Check balance
6. Generate quote
7. Confirm conversion
8. Monitor conversion progress
9. Link bank if required
10. View receipt
11. Return home

---

# Source Code Structure

```
src/
```

---

# API Layer

Located in:

```
src/api/
```

Each module maps to backend endpoints.

Examples:

```
activity.ts
banks.ts
conversions.ts
giftCards.ts
quotes.ts
wallet.ts
```

---

# Components

Shared UI components live in:

```
src/components/
```

Examples:

- ScreenHeader
- SectionCard
- PrimaryButton
- SecondaryAction

These components provide consistent layout and styling.

---

# Features

Feature-specific code lives in:

```
src/features/
```

Examples:

## Activity

```
src/features/activity/
```

Responsible for:

- activity formatting
- activity cards

---

## Conversions

```
src/features/conversions/
```

Responsible for:

- conversion timeline
- progress UI
- status formatting

---

## Quotes

```
src/features/quotes/
```

Responsible for:

- quote amount formatting
- quote helpers

---

## Gift Cards

```
src/features/giftCards/
```

Responsible for gift card flow helpers.

---

# Hooks

Reusable hooks live in:

```
src/hooks/
```

Example:

```
useConversionTimeline.ts
```

This hook polls the backend timeline endpoint.

---

# Shared Libraries

Utilities live in:

```
src/lib/
```

Examples:

- API fetch wrapper
- shared contracts
- formatting helpers
- error translation

---

# State Management

Authentication state lives in:

```
src/state/auth.tsx
```

Responsible for:

- storing auth token
- providing auth context

---

# Shared Contracts

Types for API responses live in:

```
src/lib/contracts.ts
```

These define:

- wallet balance responses
- activity feed items
- gift card responses
- quote responses
- conversion responses
- bank accounts
- timeline events

---

# Error Handling

Error translation lives in:

```
src/lib/errors.ts
```

Backend error codes are converted into user-friendly messages.

Examples:

- QUOTE_EXPIRED
- LIMIT_DAILY_EXCEEDED
- KYC_REQUIRED
- BANK_ACCOUNT_NOT_FOUND

---

# Formatting

Formatting helpers live in:

```
src/lib/format.ts
```

Examples:

- formatUsd
- formatXrp
- prettifyStatus
- formatDateTime

These helpers are reused across features.

---

# Running the App

From the repo root:

```
npm run dev -w mobile
```

Or inside the mobile directory:

```
npm run dev
```

Expo will start the development server.

---

# API Base URL

The mobile app dynamically selects the API base URL.

Typical values:

iOS Simulator:

```
http://localhost:4000
```

Android Emulator:

```
http://10.0.2.2:4000
```

Physical device:

```
http://<LAN_IP>:4000
```

Example:

```
http://192.168.1.78:4000
```

---

# Development Workflow

Typical workflow:

1. start backend
2. start mobile app
3. run conversion flow
4. inspect timeline updates
5. adjust UI
6. commit changes

---

# Linting

Run lint:

```
npm run lint
```

---

# Formatting

Formatting is managed by the root workspace.

```
npm run format
```

---

# Future Improvements

Potential future improvements include:

- automated UI tests
- conversion retry UI
- improved bank linking UX
- enhanced activity filtering
- offline support
