import Database from 'better-sqlite3';
import type { Clue, Model, Evaluation, WeeklyRanking } from './types.js';

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

// Clue queries
export function getCluesForWeek(dbPath: string, weekId: string): Clue[] {
  const db = getDb(dbPath);

  return db.prepare(`
    SELECT c.id, c.puzzle_id as puzzleId, c.clue_number as clueNumber,
           c.direction, c.clue_text as clueText, c.answer, c.letter_count as letterCount
    FROM clues c
    JOIN puzzles p ON c.puzzle_id = p.id
    WHERE p.week_id = ?
    ORDER BY p.id, c.direction, c.clue_number
  `).all(weekId) as Clue[];
}

export function getAllClues(dbPath: string): Clue[] {
  const db = getDb(dbPath);

  return db.prepare(`
    SELECT c.id, c.puzzle_id as puzzleId, c.clue_number as clueNumber,
           c.direction, c.clue_text as clueText, c.answer, c.letter_count as letterCount
    FROM clues c
    ORDER BY c.puzzle_id, c.direction, c.clue_number
  `).all() as Clue[];
}

// Model queries
export function getActiveModels(dbPath: string): Model[] {
  const db = getDb(dbPath);

  return db.prepare(`
    SELECT id, openrouter_id as openrouterId, provider, model_name as modelName,
           display_name as displayName, is_active as isActive
    FROM models
    WHERE is_active = 1
    ORDER BY provider, display_name
  `).all() as Model[];
}

export function getModelById(dbPath: string, id: number): Model | null {
  const db = getDb(dbPath);

  return db.prepare(`
    SELECT id, openrouter_id as openrouterId, provider, model_name as modelName,
           display_name as displayName, is_active as isActive
    FROM models
    WHERE id = ?
  `).get(id) as Model | null;
}

// Evaluation queries
// Only returns true for successful evaluations (no error) - errors get retried
export function evaluationExists(dbPath: string, clueId: number, modelId: number): boolean {
  const db = getDb(dbPath);

  const result = db.prepare(`
    SELECT 1 FROM evaluations
    WHERE clue_id = ? AND model_id = ? AND error_message IS NULL
  `).get(clueId, modelId);

  return !!result;
}

// Uses INSERT OR REPLACE to allow retrying failed evaluations
export function insertEvaluation(dbPath: string, evaluation: Evaluation): void {
  const db = getDb(dbPath);

  db.prepare(`
    INSERT OR REPLACE INTO evaluations (clue_id, model_id, week_id, model_response, extracted_answer,
                             is_correct, response_time_ms, tokens_used, cost, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    evaluation.clueId,
    evaluation.modelId,
    evaluation.weekId,
    evaluation.modelResponse,
    evaluation.extractedAnswer,
    evaluation.isCorrect ? 1 : 0,
    evaluation.responseTimeMs,
    evaluation.tokensUsed,
    evaluation.cost,
    evaluation.errorMessage
  );
}

export function getEvaluationsForWeek(dbPath: string, weekId: string): Array<Evaluation & { modelDisplayName: string }> {
  const db = getDb(dbPath);

  return db.prepare(`
    SELECT e.clue_id as clueId, e.model_id as modelId, e.week_id as weekId,
           e.model_response as modelResponse, e.extracted_answer as extractedAnswer,
           e.is_correct as isCorrect, e.response_time_ms as responseTimeMs,
           e.tokens_used as tokensUsed, e.cost, e.error_message as errorMessage,
           m.display_name as modelDisplayName
    FROM evaluations e
    JOIN models m ON e.model_id = m.id
    WHERE e.week_id = ?
  `).all(weekId) as Array<Evaluation & { modelDisplayName: string }>;
}

// Ranking queries
export function insertWeeklyRanking(dbPath: string, ranking: WeeklyRanking): void {
  const db = getDb(dbPath);

  db.prepare(`
    INSERT OR REPLACE INTO weekly_rankings
    (week_id, model_id, total_clues, correct_count, accuracy, rank, previous_rank, rank_change)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ranking.weekId,
    ranking.modelId,
    ranking.totalClues,
    ranking.correctCount,
    ranking.accuracy,
    ranking.rank,
    ranking.previousRank,
    ranking.rankChange
  );
}

export function getWeeklyRankings(dbPath: string, weekId: string): WeeklyRanking[] {
  const db = getDb(dbPath);

  return db.prepare(`
    SELECT week_id as weekId, model_id as modelId, total_clues as totalClues,
           correct_count as correctCount, accuracy, rank,
           previous_rank as previousRank, rank_change as rankChange
    FROM weekly_rankings
    WHERE week_id = ?
    ORDER BY rank
  `).all(weekId) as WeeklyRanking[];
}

export function getPreviousWeekRankings(dbPath: string, currentWeekId: string): WeeklyRanking[] {
  const db = getDb(dbPath);

  return db.prepare(`
    SELECT week_id as weekId, model_id as modelId, total_clues as totalClues,
           correct_count as correctCount, accuracy, rank,
           previous_rank as previousRank, rank_change as rankChange
    FROM weekly_rankings
    WHERE week_id < ?
    ORDER BY week_id DESC, rank
    LIMIT 100
  `).all(currentWeekId) as WeeklyRanking[];
}

// Tenure queries
export function getCurrentTenure(dbPath: string, modelId: number, rankPosition: number): { id: number; weeksCount: number } | null {
  const db = getDb(dbPath);

  return db.prepare(`
    SELECT id, weeks_count as weeksCount
    FROM rank_tenure
    WHERE model_id = ? AND rank_position = ? AND is_current = 1
  `).get(modelId, rankPosition) as { id: number; weeksCount: number } | null;
}

export function extendTenure(dbPath: string, tenureId: number, weekId: string): void {
  const db = getDb(dbPath);

  // Only increment if this week hasn't been counted yet
  db.prepare(`
    UPDATE rank_tenure
    SET weeks_count = weeks_count + 1, end_week = ?
    WHERE id = ? AND end_week != ?
  `).run(weekId, tenureId, weekId);
}

export function endCurrentTenures(dbPath: string, modelId: number, weekId: string): void {
  const db = getDb(dbPath);

  db.prepare(`
    UPDATE rank_tenure
    SET is_current = 0, end_week = ?
    WHERE model_id = ? AND is_current = 1
  `).run(weekId, modelId);
}

export function createTenure(dbPath: string, modelId: number, rankPosition: number, weekId: string): void {
  const db = getDb(dbPath);

  db.prepare(`
    INSERT INTO rank_tenure (model_id, rank_position, start_week, weeks_count, is_current)
    VALUES (?, ?, ?, 1, 1)
  `).run(modelId, rankPosition, weekId);
}

// Metadata
export function getMetadata(dbPath: string, key: string): string | null {
  const db = getDb(dbPath);

  const result = db.prepare(`
    SELECT value FROM metadata WHERE key = ?
  `).get(key) as { value: string | null } | undefined;

  return result?.value || null;
}

export function setMetadata(dbPath: string, key: string, value: string): void {
  const db = getDb(dbPath);

  db.prepare(`
    INSERT OR REPLACE INTO metadata (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).run(key, value);
}
