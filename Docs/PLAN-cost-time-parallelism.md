# Plan: Add Cost/Time Metrics and Parallelism to Evaluation

## Summary

1. Add parallel execution by model to speed up evaluations
2. Capture cost from OpenRouter response (no hardcoding needed)
3. Display time and cost metrics on leaderboard cards

---

## Part 1: Parallel Execution by Model

**File:** `packages/evaluator/src/index.ts`

Current behavior: Sequential loop through models, then clues, with 500ms delay each.

**Changes:**
1. Extract model evaluation into separate async function `evaluateModelClues(model, clues, options)`
2. Use `Promise.all()` to run all models concurrently
3. Keep 500ms delay between clues within each model (rate limiting)

```typescript
// New structure:
async function evaluateModelClues(model, clues, options) {
  const results = [];
  for (const clue of clues) {
    const result = await evaluateSingleClue(model, clue, options);
    results.push(result);
    await sleep(500);
  }
  return results;
}

// In evaluateWeek():
const modelResults = await Promise.all(
  models.map(model => evaluateModelClues(model, clues, options))
);
```

**Database note:** `better-sqlite3` is synchronous, so concurrent async contexts writing to it should be safe.

---

## Part 2: Capture Cost from OpenRouter

**File:** `packages/evaluator/src/openrouter-client.ts`

OpenRouter returns cost when you include `usage: {include: true}` in the request body. The response includes cost in the `usage` object.

**Changes:**
1. Add `usage: { include: true }` to request body
2. Update `OpenRouterResponse` type to include cost field
3. Return cost in `CompletionResult`

```typescript
// In request body:
body: JSON.stringify({
  model,
  messages,
  max_tokens: maxTokens,
  temperature,
  usage: { include: true }  // Add this
}),

// Capture from response:
const cost = data.usage?.cost || 0;
```

**File:** `packages/evaluator/src/types.ts`

Update `OpenRouterResponse.usage` to include:
```typescript
usage?: {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number;  // Add this
};
```

---

## Part 3: Store Cost in Database

**File:** `packages/evaluator/src/db.ts`

Add new column to evaluations table:
```sql
ALTER TABLE evaluations ADD COLUMN cost REAL;
```

Update `insertEvaluation()` to include cost field.

**File:** `scripts/init-db.ts`

Add `cost REAL` column to evaluations table schema.

**File:** `packages/evaluator/src/types.ts`

Add to `Evaluation` interface:
```typescript
cost: number | null;
```

---

## Part 4: Display on Dashboard Leaderboard

**File:** `packages/dashboard/src/db/queries.ts`

Add aggregation to `getWeeklyLeaderboard()`:
```sql
SELECT
  ...,
  AVG(e.response_time_ms) as avgResponseTimeMs,
  SUM(e.cost) as totalCost
FROM weekly_rankings wr
LEFT JOIN evaluations e ON e.model_id = wr.model_id AND e.week_id = wr.week_id
...
GROUP BY wr.model_id
```

**File:** `packages/dashboard/src/types/index.ts`

Add to `WeeklyRanking`:
```typescript
avgResponseTimeMs?: number;
totalCost?: number;
```

**File:** `packages/dashboard/src/components/Leaderboard.tsx`

Add metrics below each model's accuracy display:
- Average response time: "1.2s avg"
- Total cost: "$0.05"

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/evaluator/src/index.ts` | Add parallel execution |
| `packages/evaluator/src/openrouter-client.ts` | Enable usage reporting, capture cost |
| `packages/evaluator/src/types.ts` | Add cost to types |
| `packages/evaluator/src/db.ts` | Add cost column, update insert |
| `scripts/init-db.ts` | Add cost column to schema |
| `packages/dashboard/src/db/queries.ts` | Aggregate time/cost in query |
| `packages/dashboard/src/types/index.ts` | Add metrics to types |
| `packages/dashboard/src/components/Leaderboard.tsx` | Display metrics |

---

## Implementation Order

1. **Evaluator parallelism** - Refactor index.ts for parallel model execution
2. **OpenRouter cost capture** - Update client to request and return cost
3. **Database schema** - Add cost column
4. **Dashboard query** - Aggregate metrics
5. **Dashboard UI** - Display on leaderboard cards
6. **Build/test** - Run TypeScript checks and dashboard build
