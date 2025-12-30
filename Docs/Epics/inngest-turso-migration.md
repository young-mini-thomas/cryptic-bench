# Epic: Migrate to Inngest + Turso

**Status:** Planned
**Goal:** Replace GitHub Actions + SQLite with Inngest durable workflows + Turso for reliability and automatic retries

## Overview

Migrate cryptic-bench from a GitHub Actions cron job with file-based SQLite to Inngest durable workflows with Turso (libSQL) for persistence.

### Current Architecture
```
GitHub Actions (cron) → scrape → evaluate → copy DB → deploy dashboard
SQLite file copied to dashboard/public/ for client-side sql.js loading
```

### Target Architecture
```
Inngest (durable functions) → scrape → evaluate → calculate rankings
Turso (remote libSQL) ← queried directly by dashboard
```

---

## Phase 1: Database Migration (Turso)

### 1.1 Add Dependencies

**Root `package.json`:**
- Add `@libsql/client`

**`packages/scraper/package.json`:**
- Remove `better-sqlite3`
- Add `@libsql/client`

**`packages/evaluator/package.json`:**
- Remove `better-sqlite3`
- Add `@libsql/client`

**`packages/dashboard/package.json`:**
- Remove `sql.js`
- Add `@libsql/client`

### 1.2 Create Shared Database Client

**New file: `packages/shared/src/db-client.ts`**

Centralized Turso client using env vars:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

### 1.3 Migrate Scraper DB Layer

**File: `packages/scraper/src/db.ts`**

Convert sync better-sqlite3 calls to async @libsql/client:

| better-sqlite3 | @libsql/client |
|----------------|----------------|
| `getDb(dbPath)` | `getTursoClient()` (no path needed) |
| `db.prepare(sql).get()` | `await client.execute({ sql, args })` |
| `db.prepare(sql).run()` | `await client.execute({ sql, args })` |
| `db.transaction()` | `await client.batch([...], 'write')` |

Functions to migrate:
- `getLastScrapedPuzzleId()` → async
- `setLastScrapedPuzzleId()` → async
- `puzzleExists()` → async
- `insertPuzzle()` → async
- `insertClues()` → async (use batch for transaction)
- `getCluesForWeek()` → async
- `getPuzzlesForWeek()` → async

### 1.4 Migrate Evaluator DB Layer

**File: `packages/evaluator/src/db.ts`**

Same pattern as scraper. Functions to migrate:
- `getCluesForWeek()`, `getAllClues()`
- `getActiveModels()`, `getModelById()`
- `evaluationExists()`, `insertEvaluation()`
- `getEvaluationsForWeek()`, `insertWeeklyRanking()`
- `getWeeklyRankings()`, `getPreviousWeekRankings()`
- Tenure functions: `getCurrentTenure`, `extendTenure`, `createTenure`
- Metadata functions: `getMetadata`, `setMetadata`

### 1.5 Migrate Init-DB Script

**File: `scripts/init-db.ts`**

- Use `@libsql/client` instead of `better-sqlite3`
- Remove file path logic
- Make script async
- `PRAGMA foreign_keys = ON` stays the same

---

## Phase 2: Dashboard Migration

### 2.1 Replace sql.js with Turso Web Client

**File: `packages/dashboard/src/db/sqlite-client.ts`**

Complete rewrite using `@libsql/client/web` import for browser environment.

### 2.2 Update Dashboard Queries

**File: `packages/dashboard/src/db/queries.ts`**

All queries become async:
- `getAvailableWeeks()` → async
- `getCurrentWeekId()` → async
- `getWeeklyLeaderboard()` → async
- `getModelClueResults()` → async
- `getWeekSummary()` → async
- `getModelHistory()` → async
- `getTenureLeaders()` → async

Result access changes: `result[0].values` → `result.rows`

### 2.3 Environment Variables

**Dashboard build-time vars:**
```
VITE_TURSO_DATABASE_URL=libsql://your-db.turso.io
VITE_TURSO_AUTH_TOKEN=<read-only-token>
```

---

## Phase 3: Inngest Functions

### 3.1 Create Inngest Package

**New package: `packages/inngest/`**

Structure:
```
packages/inngest/
├── package.json
├── tsconfig.json
├── src/
│   ├── client.ts          # Inngest client + event schemas
│   ├── serve.ts           # Hono server for Inngest endpoint
│   └── functions/
│       ├── scrape-puzzles.ts
│       ├── evaluate-models.ts
│       └── calculate-rankings.ts
```

Dependencies:
- `inngest`
- `hono`
- `@cryptic-bench/scraper`
- `@cryptic-bench/evaluator`

### 3.2 Scrape Function

**File: `packages/inngest/src/functions/scrape-puzzles.ts`**

```typescript
inngest.createFunction(
  { id: 'scrape-puzzles', retries: 3 },
  { cron: '0 6 * * 0' }, // Every Sunday 6 AM UTC
  async ({ step }) => {
    // Step 1: Fetch puzzles from Fifteensquared
    const puzzles = await step.run('fetch-puzzles', ...)

    // Step 2: Save each puzzle (individual steps for durability)
    for (const puzzle of puzzles) {
      await step.run(`save-puzzle-${puzzle.id}`, ...)
    }

    // Step 3: Trigger evaluation
    await step.sendEvent('benchmark/scrape.complete', ...)
  }
)
```

### 3.3 Evaluate Function

**File: `packages/inngest/src/functions/evaluate-models.ts`**

```typescript
inngest.createFunction(
  { id: 'evaluate-models', retries: 3, concurrency: { limit: 1 } },
  { event: 'benchmark/scrape.complete' },
  async ({ event, step }) => {
    // Step 1: Get clues and models
    const { clues, models } = await step.run('get-data', ...)

    // Step 2: Each evaluation is a separate retriable step
    for (const model of models) {
      for (const clue of clues) {
        await step.run(`eval-${model.id}-${clue.id}`, ...)
        await step.sleep('rate-limit', '500ms')
      }
    }

    // Step 3: Trigger rankings
    await step.sendEvent('benchmark/evaluate.complete', ...)
  }
)
```

### 3.4 Rankings Function

**File: `packages/inngest/src/functions/calculate-rankings.ts`**

```typescript
inngest.createFunction(
  { id: 'calculate-rankings', retries: 2 },
  { event: 'benchmark/evaluate.complete' },
  async ({ event, step }) => {
    await step.run('calculate', () => calculateWeeklyRankings(weekId))
  }
)
```

### 3.5 Serve Endpoint

**File: `packages/inngest/src/serve.ts`**

Hono server exposing `/api/inngest` endpoint for Inngest to call.

---

## Phase 4: GitHub Actions Update

### 4.1 Remove Weekly Benchmark Workflow

**Delete: `.github/workflows/weekly-benchmark.yml`**

Replaced by Inngest cron schedule.

### 4.2 Update Deploy Workflow

**File: `.github/workflows/deploy.yml`**

- Remove scrape/evaluate steps
- Remove database copy step
- Add Turso env vars for dashboard build:
  ```yaml
  env:
    VITE_TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
    VITE_TURSO_AUTH_TOKEN: ${{ secrets.TURSO_READ_TOKEN }}
  ```

---

## Phase 5: Infrastructure Setup

### 5.1 Turso Setup
1. Create Turso account and database
2. Run migrated `init-db.ts` to create schema
3. Generate tokens:
   - Full access for Inngest functions
   - Read-only for dashboard

### 5.2 Inngest Setup
1. Create Inngest account
2. Deploy serve endpoint (Vercel, Railway, or Cloudflare Workers)
3. Set environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `OPENROUTER_API_KEY`
4. Register functions with Inngest

### 5.3 Data Migration
1. Export existing SQLite data
2. Import into Turso database

---

## Files Summary

### Files to Modify

| File | Change |
|------|--------|
| `packages/scraper/src/db.ts` | better-sqlite3 → @libsql/client (async) |
| `packages/evaluator/src/db.ts` | better-sqlite3 → @libsql/client (async) |
| `packages/evaluator/src/index.ts` | Make DB calls async |
| `packages/dashboard/src/db/sqlite-client.ts` | sql.js → @libsql/client/web |
| `packages/dashboard/src/db/queries.ts` | All queries async |
| `scripts/init-db.ts` | better-sqlite3 → @libsql/client |
| `.github/workflows/weekly-benchmark.yml` | Delete |
| `.github/workflows/deploy.yml` | Add Turso env vars |

### New Files to Create

| File | Purpose |
|------|---------|
| `packages/shared/src/db-client.ts` | Shared Turso client |
| `packages/inngest/src/client.ts` | Inngest client + events |
| `packages/inngest/src/serve.ts` | Hono server |
| `packages/inngest/src/functions/scrape-puzzles.ts` | Scrape workflow |
| `packages/inngest/src/functions/evaluate-models.ts` | Evaluate workflow |
| `packages/inngest/src/functions/calculate-rankings.ts` | Rankings workflow |

---

## Implementation Order

1. Set up Turso database and run init-db
2. Migrate `packages/shared/` (new db client)
3. Migrate `packages/scraper/src/db.ts`
4. Migrate `packages/evaluator/src/db.ts` + index.ts
5. Test scraper and evaluator locally with Turso
6. Create `packages/inngest/` with functions
7. Deploy Inngest serve endpoint
8. Migrate dashboard to Turso web client
9. Update GitHub Actions
10. Export/import existing data
11. Test full pipeline via manual Inngest trigger
12. Enable cron schedule

---

## Benefits After Migration

- **Automatic retries**: Each model-clue evaluation is individually retriable
- **Durability**: If OpenRouter fails mid-evaluation, Inngest resumes from failure point
- **Live data**: Dashboard queries Turso directly (no file copy delay)
- **Observability**: Inngest provides built-in monitoring and traces
- **Event-driven**: Easy to add webhooks for on-demand evaluations later
