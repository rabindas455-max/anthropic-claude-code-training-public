# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Northwind Payments — Merchant Console

The internal tool support and ops staff use to look up a payment, refund it, work the dispute queue, and issue virtual cards.

Northwind Payments is fictional. Every merchant, cardholder, amount, and card in this app is generated.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000, no database, no seed step, no Docker
npm run build
npm run start         # serve the production build
npm run lint
npm test              # vitest run — node env, no DOM, the whole suite in <1s
npm run test:watch
```

Run a single test file directly with vitest, bypassing the `npm test` wrapper:

```bash
npx vitest run src/lib/money.test.ts
```

`@/` resolves to `src/` (see `tsconfig.json`).

Formatting isn't wrapped in an npm script; run Prettier directly:

```bash
npx prettier --write .   # prettier-plugin-tailwindcss sorts class lists too
```

## Data lives in memory

Seed data is JSON, loaded into a store module at boot. Route handlers read and write that store.

- Writes last for the life of the dev server and vanish on restart. That is expected.
- Persistence is tracked separately as NWP-203. **Do not add a database, an ORM, or migrations.**
- If you need more seed data, add it to the JSON. Never edit seed data to make a failing case disappear.

## Architecture

A payments request crosses several files in a fixed order; read them in this order too:

1. `src/data/generate.ts` builds all seed records once; `src/data/store.ts` holds them on `globalThis` so Next.js's dev-server module reloading doesn't hand out a fresh copy per request.
2. Route handlers (`src/app/api/payments/*`) never read `URLSearchParams` or filter the store themselves. They call `parseFilters` to turn query params into a `PaymentFilters` object (validating against allowlists as it goes), then `queryPayments` in `src/data/queries.ts`.
3. `queryPayments` composes three pieces — `filterPayments` → `sortPayments` → `paginate` — each exported separately so a route that needs filtered-but-unpaginated rows (an export, a metric) can call just the piece it needs instead of re-filtering by hand. This composed function is "the one query builder" the conventions and rules files keep referring to.
4. Formatting happens last and only at the boundary: `src/lib/money.ts` and `src/lib/csv.ts` turn minor-unit integers and UTC timestamps into display strings, called either by a route handler building a CSV/JSON response or by a component rendering a cell — never earlier in the pipeline.

`src/app/page.tsx` never renders: `next.config.ts` redirects `/` to `/overview`, since the console has no landing page of its own.

The export route (`src/app/api/payments/export/route.ts`) and `src/lib/csv.ts` currently fix the column set and ignore scope — check the comments in those two files before assuming either is already configurable.

## Where the rest of the context lives

This file loads every session, so it stays short. Detail that only matters once you open a particular kind of file lives in `.claude/rules/` and loads when you do:

| Rule | Applies to |
| --- | --- |
| `money.md` | `src/lib/`, `src/app/api/`, `src/data/` |
| `api-routes.md` | `src/app/api/` |
| `cards.md` | anything card-related |
| `components.md` | `src/components/`, `src/app/` |

## Conventions

These four explain most of the code, and breaking them is how bugs get in here.

1. **Money is integer minor units.** `$250.00` is `25000`. No floats, no strings with currency symbols. Format once, at the edge, next to its currency code.
2. **Storage and bucketing are UTC.** Display converts to the merchant's timezone. Nothing else does.
3. **One query builder.** Payment filtering goes through the builder behind `GET /api/payments`. A second implementation is a bug, not a shortcut.
4. **Validate on the server.** Anything from the client — column names, currencies, limits, statuses — is checked against an allowlist before it reaches a query, a filename, or the store.

## Card rules

- Generated numbers use the `4242` test BIN and a valid Luhn check digit. Nothing here may resemble a real PAN.
- The full number is returned exactly once, in the creation response. After that, last four only.
- Status is a state machine: `active ⇄ frozen`, either to `cancelled`, and `cancelled` is terminal.

## Layout

| Path | What lives there |
| --- | --- |
| `src/app/` | Console routes: overview, payments, disputes, payouts. Cards is NWP-201 and does not exist yet |
| `src/app/api/` | Route handlers |
| `src/data/` | Seed JSON, the in-memory store, and types |
| `src/components/` | Tremor-based primitives and the console's own components |
| `src/lib/` | Money, date, and CSV helpers, each with a `.test.ts` beside it. Read these before touching an amount |

## Release Standards

- Every change needs test evidence before it merges.
- No direct commits to `main`.
- Every PR description includes a one-line business impact summary.

## Before you push

Run `npm test`, then `/ship-ready`. The skill checks the rules above, not just formatting.
