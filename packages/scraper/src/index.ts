import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchGuardianClues, fetchPuzzleClues, getRecentPuzzles, sleep, type DatasetClue } from './guardian-client.js';
import { parseDatasetClues, getCurrentWeekId, getWeekStartDate } from './parser.js';
import {
  getDb,
  closeDb,
  getLastScrapedPuzzleId,
  setLastScrapedPuzzleId,
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
    console.log(`Using cryptics.georgeho.org dataset API`);
  }

  // Fetch recent Guardian clues from the dataset
  // Note: Dataset is historical (up to ~2023), so we fetch most recent available
  if (verbose) {
    console.log('Fetching Guardian puzzles from dataset...');
  }

  const clues = await fetchGuardianClues({
    limit: 500,
  });

  if (verbose) {
    console.log(`Fetched ${clues.length} clues from dataset`);
  }

  if (clues.length === 0) {
    console.log('No puzzles found in dataset');
    closeDb();
    return 0;
  }

  // Group clues by puzzle name
  const puzzleGroups = new Map<string, DatasetClue[]>();
  for (const clue of clues) {
    if (!clue.puzzle_name.toLowerCase().includes('guardian')) continue;

    const existing = puzzleGroups.get(clue.puzzle_name) || [];
    existing.push(clue);
    puzzleGroups.set(clue.puzzle_name, existing);
  }

  if (verbose) {
    console.log(`Found ${puzzleGroups.size} Guardian puzzles`);
  }

  let puzzlesScraped = 0;

  for (const [puzzleName, puzzleClues] of puzzleGroups) {
    if (puzzlesScraped >= maxPuzzles) break;

    if (verbose) {
      console.log(`\nProcessing: ${puzzleName} (${puzzleClues.length} clues)`);
    }

    const result = await savePuzzle(dbPath, puzzleClues, verbose);
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
  clues: DatasetClue[],
  verbose: boolean
): Promise<boolean> {
  const parsed = parseDatasetClues(clues);
  if (!parsed) return false;

  const { puzzle, clues: parsedClues } = parsed;

  // Check if already exists
  if (puzzleExists(dbPath, puzzle.guardianId)) {
    if (verbose) {
      console.log(`  Puzzle #${puzzle.guardianId} already exists, skipping`);
    }
    return false;
  }

  // Insert into database
  const puzzleId = insertPuzzle(dbPath, puzzle);
  insertClues(dbPath, puzzleId, parsedClues);

  if (puzzle.guardianId > 0) {
    setLastScrapedPuzzleId(dbPath, puzzle.guardianId);
  }

  if (verbose) {
    console.log(`  Saved puzzle #${puzzle.guardianId} by ${puzzle.setter || 'Unknown'}`);
    console.log(`  Date: ${puzzle.publicationDate}, Week: ${puzzle.weekId}`);
    console.log(`  Clues: ${parsedClues.length}`);
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
