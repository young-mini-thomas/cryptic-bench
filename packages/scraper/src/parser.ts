import type { DatasetClue } from './guardian-client.js';
import type { FifteensquaredPuzzle } from './fifteensquared-client.js';
import type { Puzzle, Clue, ScrapedPuzzle } from './types.js';

/**
 * Parse clues from the cryptics.georgeho.org dataset format
 */
export function parseDatasetClues(clues: DatasetClue[]): ScrapedPuzzle | null {
  if (clues.length === 0) return null;

  // Group clues by puzzle
  const firstClue = clues[0];
  const puzzleDate = firstClue.puzzle_date;
  const puzzleName = firstClue.puzzle_name;

  // Extract puzzle number from name (e.g., "Guardian 29349" -> 29349)
  const numberMatch = puzzleName.match(/(\d+)/);
  const puzzleNumber = numberMatch ? parseInt(numberMatch[1], 10) : 0;

  // Extract setter from puzzle name if present
  const setterMatch = puzzleName.match(/by\s+(\w+)/i);
  const setter = setterMatch ? setterMatch[1] : null;

  const puzzle: Puzzle = {
    guardianId: puzzleNumber,
    puzzleType: 'cryptic',
    setter,
    publicationDate: puzzleDate,
    weekId: getWeekId(new Date(puzzleDate)),
    rawJson: JSON.stringify(clues),
  };

  const parsedClues: Omit<Clue, 'puzzleId'>[] = clues.map((clue) => ({
    clueNumber: clue.clue_number || '?',
    direction: parseDirection(clue.clue_number),
    clueText: cleanClueText(clue.clue),
    answer: clue.answer.toUpperCase().replace(/[^A-Z]/g, ''),
    letterCount: extractLetterCount(clue.clue, clue.answer),
  }));

  return { puzzle, clues: parsedClues };
}

function parseDirection(clueNumber: string | null): 'across' | 'down' {
  if (!clueNumber) return 'across';
  const lower = clueNumber.toLowerCase();
  if (lower.includes('d') || lower.includes('down')) return 'down';
  return 'across';
}

function cleanClueText(clue: string): string {
  // Remove HTML tags and extra whitespace
  // Also remove the letter count from the end if present
  return clue
    .replace(/<[^>]*>/g, '')
    .replace(/\s*\(\d+(?:[,-]\d+)*\)\s*$/, '') // Remove trailing (5) or (3,4)
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLetterCount(clue: string, answer: string): string {
  // Try to extract from clue text first
  const match = clue.match(/\((\d+(?:[,-]\d+)*)\)\s*$/);
  if (match) {
    return `(${match[1]})`;
  }

  // Fall back to answer length
  const answerClean = answer.replace(/[^A-Z]/gi, '');
  return `(${answerClean.length})`;
}

export function getWeekId(date: Date): string {
  // ISO week number calculation
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getCurrentWeekId(): string {
  return getWeekId(new Date());
}

/**
 * Get the Monday of a given ISO week
 */
export function getWeekStartDate(weekId: string): Date {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return new Date();

  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);

  // January 4th is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;

  // Get Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);

  // Add weeks
  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  return targetMonday;
}

/**
 * Convert a FifteensquaredPuzzle to our internal ScrapedPuzzle format
 */
export function parseFifteensquaredPuzzle(puzzle: FifteensquaredPuzzle): ScrapedPuzzle {
  const parsedPuzzle: Puzzle = {
    guardianId: puzzle.guardianNumber,
    puzzleType: 'cryptic',
    setter: puzzle.setter,
    publicationDate: puzzle.publicationDate,
    weekId: getWeekId(new Date(puzzle.publicationDate)),
    rawJson: JSON.stringify({
      title: puzzle.title,
      url: puzzle.url,
      clueCount: puzzle.clues.length,
    }),
  };

  const parsedClues: Omit<Clue, 'puzzleId'>[] = puzzle.clues.map(clue => ({
    clueNumber: clue.clueNumber,
    direction: clue.direction,
    clueText: clue.clueText,
    answer: clue.answer,
    letterCount: clue.letterCount,
  }));

  return { puzzle: parsedPuzzle, clues: parsedClues };
}
