import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchRecentPuzzles, fetchPuzzle, type FifteensquaredPuzzle } from './fifteensquared-client.js';
import { parseFifteensquaredPuzzle, getCurrentWeekId } from './parser.js';
import {
  getDb,
  closeDb,
  puzzleExists,
  insertPuzzle,
  insertClues,
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = join(__dirname, '../../../data/cryptic-bench.db');

interface ScrapeOptions {
  dbPath?: string;
  weekId?: string;
  maxPuzzles?: number;
  verbose?: boolean;
}

export async function scrapeWeeklyPuzzles(options: ScrapeOptions = {}): Promise<number> {
  const {
    dbPath = process.env.DATABASE_PATH || DEFAULT_DB_PATH,
    weekId = getCurrentWeekId(),
    maxPuzzles = 1,
    verbose = true,
  } = options;

  if (verbose) {
    console.log(`Scraping puzzles for week: ${weekId}`);
    console.log(`Database: ${dbPath}`);
    console.log(`Using Fifteensquared.net for fresh Guardian puzzles`);
  }

  // Fetch recent Guardian puzzles from Fifteensquared
  const puzzles = await fetchRecentPuzzles({
    limit: maxPuzzles + 5, // Fetch extra in case some are duplicates
    verbose,
  });

  if (puzzles.length === 0) {
    console.log('No puzzles found from Fifteensquared');
    closeDb();
    return 0;
  }

  if (verbose) {
    console.log(`Fetched ${puzzles.length} puzzles from Fifteensquared`);
  }

  let puzzlesScraped = 0;

  for (const puzzle of puzzles) {
    if (puzzlesScraped >= maxPuzzles) break;

    if (verbose) {
      console.log(`\nProcessing: ${puzzle.title} (${puzzle.clues.length} clues)`);
    }

    const result = await savePuzzle(dbPath, puzzle, verbose);
    if (result) puzzlesScraped++;
  }

  closeDb();

  if (verbose) {
    console.log(`\nScraping complete. Puzzles scraped: ${puzzlesScraped}`);
  }

  return puzzlesScraped;
}

async function savePuzzle(
  dbPath: string,
  fifteensquaredPuzzle: FifteensquaredPuzzle,
  verbose: boolean
): Promise<boolean> {
  const { puzzle, clues } = parseFifteensquaredPuzzle(fifteensquaredPuzzle);

  // Check if already exists
  if (puzzleExists(dbPath, puzzle.guardianId)) {
    if (verbose) {
      console.log(`  Puzzle #${puzzle.guardianId} already exists, skipping`);
    }
    return false;
  }

  // Insert into database
  const puzzleId = insertPuzzle(dbPath, puzzle);
  insertClues(dbPath, puzzleId, clues);

  if (verbose) {
    console.log(`  Saved puzzle #${puzzle.guardianId} by ${puzzle.setter || 'Unknown'}`);
    console.log(`  Date: ${puzzle.publicationDate}, Week: ${puzzle.weekId}`);
    console.log(`  Clues: ${clues.length}`);
  }

  return true;
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options: ScrapeOptions = {
    verbose: true,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && args[i + 1]) {
      options.dbPath = args[++i];
    } else if (args[i] === '--week' && args[i + 1]) {
      options.weekId = args[++i];
    } else if (args[i] === '--max' && args[i + 1]) {
      options.maxPuzzles = parseInt(args[++i], 10);
    } else if (args[i] === '--quiet') {
      options.verbose = false;
    }
  }

  scrapeWeeklyPuzzles(options).catch((error) => {
    console.error('Scraping failed:', error);
    process.exit(1);
  });
}
