import Database from 'better-sqlite3';
import type { Puzzle, Clue } from './types.js';

let db: Database.Database | null = null;

export function getDb(dbPath: string): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getLastScrapedPuzzleId(dbPath: string): number | null {
  const db = getDb(dbPath);
  const result = db.prepare(`
    SELECT value FROM metadata WHERE key = 'last_scraped_puzzle_id'
  `).get() as { value: string | null } | undefined;

  return result?.value ? parseInt(result.value, 10) : null;
}

export function setLastScrapedPuzzleId(dbPath: string, id: number): void {
  const db = getDb(dbPath);
  db.prepare(`
    INSERT OR REPLACE INTO metadata (key, value, updated_at)
    VALUES ('last_scraped_puzzle_id', ?, CURRENT_TIMESTAMP)
  `).run(String(id));
}

export function puzzleExists(dbPath: string, guardianId: number): boolean {
  const db = getDb(dbPath);
  const result = db.prepare(`
    SELECT 1 FROM puzzles WHERE guardian_id = ?
  `).get(guardianId);

  return !!result;
}

export function insertPuzzle(dbPath: string, puzzle: Puzzle): number {
  const db = getDb(dbPath);

  const result = db.prepare(`
    INSERT INTO puzzles (guardian_id, puzzle_type, setter, publication_date, week_id, raw_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    puzzle.guardianId,
    puzzle.puzzleType,
    puzzle.setter,
    puzzle.publicationDate,
    puzzle.weekId,
    puzzle.rawJson
  );

  return result.lastInsertRowid as number;
}

export function insertClues(dbPath: string, puzzleId: number, clues: Omit<Clue, 'puzzleId'>[]): void {
  const db = getDb(dbPath);

  const stmt = db.prepare(`
    INSERT INTO clues (puzzle_id, clue_number, direction, clue_text, answer, letter_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((clues: Omit<Clue, 'puzzleId'>[]) => {
    for (const clue of clues) {
      stmt.run(puzzleId, clue.clueNumber, clue.direction, clue.clueText, clue.answer, clue.letterCount);
    }
  });

  insertMany(clues);
}

export function getCluesForWeek(dbPath: string, weekId: string): Array<Clue & { puzzleId: number }> {
  const db = getDb(dbPath);

  return db.prepare(`
    SELECT c.id, c.puzzle_id as puzzleId, c.clue_number as clueNumber,
           c.direction, c.clue_text as clueText, c.answer, c.letter_count as letterCount
    FROM clues c
    JOIN puzzles p ON c.puzzle_id = p.id
    WHERE p.week_id = ?
  `).all(weekId) as Array<Clue & { puzzleId: number }>;
}

export function getPuzzlesForWeek(dbPath: string, weekId: string): Puzzle[] {
  const db = getDb(dbPath);

  return db.prepare(`
    SELECT guardian_id as guardianId, puzzle_type as puzzleType, setter,
           publication_date as publicationDate, week_id as weekId
    FROM puzzles
    WHERE week_id = ?
  `).all(weekId) as Puzzle[];
}
