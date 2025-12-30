# Claude Code Instructions

## Required Checks Before Committing

Always run these checks after making changes:

```bash
# TypeScript check for dashboard
npx tsc --noEmit --project packages/dashboard/tsconfig.json

# Full dashboard build
npm run build --workspace=@cryptic-bench/dashboard
```

## Project Structure

- `packages/dashboard/` - React/Vite dashboard for displaying benchmark results
- `packages/evaluator/` - Evaluation logic for testing LLMs on cryptic clues
- `scripts/` - Database initialization and scraping scripts
- `data/` - SQLite database and related data files

## Common Tasks

- **Run dashboard locally:** `npm run dev --workspace=@cryptic-bench/dashboard`
- **Build dashboard:** `npm run build --workspace=@cryptic-bench/dashboard`
- **Initialize database:** `npm run init-db`
