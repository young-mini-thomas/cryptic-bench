import { getDatabase } from './sqlite-client';
import type { WeeklyRanking, ClueResult, WeekSummary } from '../types';

export function getAvailableWeeks(): string[] {
  const db = getDatabase();
  const result = db.exec(`
    SELECT DISTINCT week_id
    FROM weekly_rankings
    ORDER BY week_id DESC
  `);

  if (result.length === 0) return [];

  return result[0].values.map((row) => row[0] as string);
}

export function getCurrentWeekId(): string | null {
  const weeks = getAvailableWeeks();
  return weeks.length > 0 ? weeks[0] : null;
}

export function getWeeklyLeaderboard(weekId: string): WeeklyRanking[] {
  const db = getDatabase();
  const result = db.exec(`
    SELECT
      wr.week_id,
      wr.model_id,
      m.display_name,
      m.provider,
      wr.total_clues,
      wr.correct_count,
      wr.accuracy,
      wr.rank,
      wr.previous_rank,
      wr.rank_change,
      rt.weeks_count as tenure_weeks
    FROM weekly_rankings wr
    JOIN models m ON wr.model_id = m.id
    LEFT JOIN rank_tenure rt ON m.id = rt.model_id
      AND rt.rank_position = wr.rank
      AND rt.is_current = 1
    WHERE wr.week_id = ?
    ORDER BY wr.rank ASC
  `, [weekId]);

  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    weekId: row[0] as string,
    modelId: row[1] as number,
    displayName: row[2] as string,
    provider: row[3] as string,
    totalClues: row[4] as number,
    correctCount: row[5] as number,
    accuracy: row[6] as number,
    rank: row[7] as number,
    previousRank: row[8] as number | null,
    rankChange: row[9] as number | null,
    tenureWeeks: row[10] as number | null,
  }));
}

export function getModelClueResults(modelId: number, weekId: string): ClueResult[] {
  const db = getDatabase();
  const result = db.exec(`
    SELECT
      c.id,
      c.clue_text,
      c.letter_count,
      c.answer,
      e.model_response,
      e.extracted_answer,
      e.is_correct,
      p.setter
    FROM evaluations e
    JOIN clues c ON e.clue_id = c.id
    JOIN puzzles p ON c.puzzle_id = p.id
    WHERE e.model_id = ?
      AND e.week_id = ?
    ORDER BY e.is_correct ASC, c.clue_number
  `, [modelId, weekId]);

  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    clueId: row[0] as number,
    clueText: row[1] as string,
    letterCount: row[2] as string,
    answer: row[3] as string,
    modelResponse: row[4] as string | null,
    extractedAnswer: row[5] as string | null,
    isCorrect: row[6] === 1,
    setter: row[7] as string | null,
  }));
}

export function getWeekSummary(weekId: string): WeekSummary | null {
  const db = getDatabase();
  const result = db.exec(`
    SELECT
      ? as week_id,
      COUNT(DISTINCT p.id) as puzzle_count,
      COUNT(DISTINCT c.id) as clue_count,
      COUNT(DISTINCT wr.model_id) as model_count
    FROM puzzles p
    JOIN clues c ON c.puzzle_id = p.id
    LEFT JOIN weekly_rankings wr ON wr.week_id = ?
    WHERE p.week_id = ?
  `, [weekId, weekId, weekId]);

  if (result.length === 0 || !result[0].values[0]) return null;

  const row = result[0].values[0];
  return {
    weekId: row[0] as string,
    puzzleCount: row[1] as number,
    clueCount: row[2] as number,
    modelCount: row[3] as number,
  };
}

export function getModelHistory(modelId: number): Array<{ weekId: string; rank: number; accuracy: number }> {
  const db = getDatabase();
  const result = db.exec(`
    SELECT week_id, rank, accuracy
    FROM weekly_rankings
    WHERE model_id = ?
    ORDER BY week_id DESC
    LIMIT 52
  `, [modelId]);

  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    weekId: row[0] as string,
    rank: row[1] as number,
    accuracy: row[2] as number,
  }));
}

export function getTenureLeaders(): Array<{ displayName: string; rankPosition: number; weeksCount: number }> {
  const db = getDatabase();
  const result = db.exec(`
    SELECT
      m.display_name,
      rt.rank_position,
      rt.weeks_count
    FROM rank_tenure rt
    JOIN models m ON rt.model_id = m.id
    WHERE rt.rank_position <= 3 AND rt.is_current = 1
    ORDER BY rt.rank_position, rt.weeks_count DESC
  `);

  if (result.length === 0) return [];

  return result[0].values.map((row) => ({
    displayName: row[0] as string,
    rankPosition: row[1] as number,
    weeksCount: row[2] as number,
  }));
}
