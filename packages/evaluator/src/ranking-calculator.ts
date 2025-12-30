import type { WeeklyRanking } from './types.js';
import {
  getDb,
  getEvaluationsForWeek,
  getActiveModels,
  insertWeeklyRanking,
  getPreviousWeekRankings,
  getCurrentTenure,
  extendTenure,
  endCurrentTenures,
  createTenure,
} from './db.js';

interface ModelResult {
  modelId: number;
  displayName: string;
  totalClues: number;
  correctCount: number;
  accuracy: number;
}

export function calculateWeeklyRankings(dbPath: string, weekId: string, verbose = true): WeeklyRanking[] {
  if (verbose) {
    console.log(`\nCalculating rankings for week: ${weekId}`);
  }

  // Get all evaluations for the week
  const evaluations = getEvaluationsForWeek(dbPath, weekId);

  if (evaluations.length === 0) {
    console.log('No evaluations found for this week');
    return [];
  }

  // Aggregate results by model
  const modelResults = new Map<number, ModelResult>();

  for (const evaluation of evaluations) {
    let result = modelResults.get(evaluation.modelId);

    if (!result) {
      result = {
        modelId: evaluation.modelId,
        displayName: evaluation.modelDisplayName,
        totalClues: 0,
        correctCount: 0,
        accuracy: 0,
      };
      modelResults.set(evaluation.modelId, result);
    }

    result.totalClues++;
    if (evaluation.isCorrect) {
      result.correctCount++;
    }
  }

  // Calculate accuracy for each model
  for (const result of modelResults.values()) {
    result.accuracy = (result.correctCount / result.totalClues) * 100;
  }

  // Sort by accuracy (descending), then by display name for ties
  const sortedResults = [...modelResults.values()].sort((a, b) => {
    if (b.accuracy !== a.accuracy) {
      return b.accuracy - a.accuracy;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  // Get previous week's rankings for comparison
  const previousRankings = getPreviousWeekRankings(dbPath, weekId);
  const previousRankMap = new Map<number, number>();

  // Get the most recent week's rankings
  if (previousRankings.length > 0) {
    const previousWeekId = previousRankings[0].weekId;
    for (const ranking of previousRankings) {
      if (ranking.weekId === previousWeekId) {
        previousRankMap.set(ranking.modelId, ranking.rank);
      }
    }
  }

  // Assign ranks and calculate changes
  const rankings: WeeklyRanking[] = [];
  let currentRank = 1;

  for (let i = 0; i < sortedResults.length; i++) {
    const result = sortedResults[i];

    // Handle ties - same accuracy = same rank
    if (i > 0 && result.accuracy < sortedResults[i - 1].accuracy) {
      currentRank = i + 1;
    }

    const previousRank = previousRankMap.get(result.modelId) ?? null;
    const rankChange = previousRank !== null ? previousRank - currentRank : null;

    const ranking: WeeklyRanking = {
      weekId,
      modelId: result.modelId,
      totalClues: result.totalClues,
      correctCount: result.correctCount,
      accuracy: result.accuracy,
      rank: currentRank,
      previousRank,
      rankChange,
    };

    rankings.push(ranking);

    // Save to database
    insertWeeklyRanking(dbPath, ranking);

    if (verbose) {
      const changeStr = rankChange !== null
        ? rankChange > 0 ? `(+${rankChange})` : rankChange < 0 ? `(${rankChange})` : '(=)'
        : '(new)';
      console.log(
        `  #${currentRank} ${result.displayName}: ${result.correctCount}/${result.totalClues} (${result.accuracy.toFixed(1)}%) ${changeStr}`
      );
    }
  }

  // Update tenure records
  updateTenureRecords(dbPath, weekId, rankings, verbose);

  return rankings;
}

function updateTenureRecords(
  dbPath: string,
  weekId: string,
  rankings: WeeklyRanking[],
  verbose: boolean
): void {
  if (verbose) {
    console.log('\nUpdating tenure records...');
  }

  for (const ranking of rankings) {
    const currentTenure = getCurrentTenure(dbPath, ranking.modelId, ranking.rank);

    if (currentTenure) {
      // Model is still at this rank - extend tenure
      extendTenure(dbPath, currentTenure.id, weekId);

      if (verbose && ranking.rank <= 3) {
        console.log(`  ${ranking.rank === 1 ? '👑' : ''}Model ${ranking.modelId} extended tenure at #${ranking.rank} (${currentTenure.weeksCount + 1} weeks)`);
      }
    } else {
      // Model moved to a new rank
      // End any previous current tenures for this model
      endCurrentTenures(dbPath, ranking.modelId, weekId);

      // Start new tenure at current rank
      createTenure(dbPath, ranking.modelId, ranking.rank, weekId);

      if (verbose && ranking.rank <= 3) {
        console.log(`  Model ${ranking.modelId} started new tenure at #${ranking.rank}`);
      }
    }
  }
}

export function getWeekIdFromDate(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getCurrentWeekId(): string {
  return getWeekIdFromDate(new Date());
}
