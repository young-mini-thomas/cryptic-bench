import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { copyFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

async function runWeekly() {
  const dbPath = process.env.DATABASE_PATH || join(ROOT_DIR, 'data/cryptic-bench.db');

  console.log('='.repeat(60));
  console.log('Cryptic-Bench Weekly Run');
  console.log('='.repeat(60));
  console.log(`Database: ${dbPath}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('');

  // Step 1: Initialize database if needed
  if (!existsSync(dbPath)) {
    console.log('Step 1: Initializing database...');
    const initDb = await import('./init-db.js');
    console.log('Database initialized.\n');
  } else {
    console.log('Step 1: Database exists, skipping initialization.\n');
  }

  // Step 2: Scrape latest puzzles
  console.log('Step 2: Scraping Guardian crosswords...');
  const { scrapeWeeklyPuzzles } = await import('../packages/scraper/src/index.js');
  const puzzlesScraped = await scrapeWeeklyPuzzles({
    dbPath,
    maxPuzzles: 1,
    verbose: true,
  });
  console.log(`Scraped ${puzzlesScraped} puzzle(s).\n`);

  // Step 3: Run evaluations
  console.log('Step 3: Running LLM evaluations...');
  const { evaluateWeek } = await import('../packages/evaluator/src/index.js');
  await evaluateWeek({
    dbPath,
    verbose: true,
    skipExisting: true,
    calculateRankings: true,
  });
  console.log('Evaluations complete.\n');

  // Step 4: Copy database to dashboard public folder
  console.log('Step 4: Copying database to dashboard...');
  const dashboardDbPath = join(ROOT_DIR, 'packages/dashboard/public/cryptic-bench.db');
  copyFileSync(dbPath, dashboardDbPath);
  console.log(`Copied to: ${dashboardDbPath}\n`);

  console.log('='.repeat(60));
  console.log('Weekly run complete!');
  console.log('='.repeat(60));
}

runWeekly().catch((error) => {
  console.error('Weekly run failed:', error);
  process.exit(1);
});
