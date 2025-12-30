import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createCompletion } from './openrouter-client.js';
import { buildMessages } from './prompt-builder.js';
import { extractAnswer, checkAnswer } from './answer-checker.js';
import { calculateWeeklyRankings, getCurrentWeekId } from './ranking-calculator.js';
import {
  getDb,
  closeDb,
  getCluesForWeek,
  getAllClues,
  getActiveModels,
  evaluationExists,
  insertEvaluation,
  setMetadata,
} from './db.js';
import type { Clue, Model, Evaluation } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = join(__dirname, '../../../data/cryptic-bench.db');

interface EvaluateOptions {
  dbPath?: string;
  weekId?: string;
  apiKey?: string;
  verbose?: boolean;
  skipExisting?: boolean;
  calculateRankings?: boolean;
}

export async function evaluateWeek(options: EvaluateOptions = {}): Promise<void> {
  const {
    dbPath = process.env.DATABASE_PATH || DEFAULT_DB_PATH,
    weekId = getCurrentWeekId(),
    apiKey = process.env.OPENROUTER_API_KEY,
    verbose = true,
    skipExisting = true,
    calculateRankings = true,
  } = options;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required');
  }

  if (verbose) {
    console.log(`Evaluating models for week: ${weekId}`);
    console.log(`Database: ${dbPath}`);
  }

  // Get clues for the week
  let clues = getCluesForWeek(dbPath, weekId);

  // If no clues for specific week, get all available clues
  if (clues.length === 0) {
    if (verbose) {
      console.log(`No clues found for week ${weekId}, using all available clues`);
    }
    clues = getAllClues(dbPath);
  }

  if (clues.length === 0) {
    console.log('No clues found in database. Run scraper first.');
    return;
  }

  if (verbose) {
    console.log(`Found ${clues.length} clues to evaluate`);
  }

  // Get active models
  const models = getActiveModels(dbPath);

  if (models.length === 0) {
    console.log('No active models found in database');
    return;
  }

  if (verbose) {
    console.log(`Evaluating ${models.length} models:`);
    for (const model of models) {
      console.log(`  - ${model.displayName} (${model.openrouterId})`);
    }
    console.log('');
  }

  // Evaluate all models in parallel (each model processes clues sequentially)
  if (verbose) {
    console.log(`\nStarting parallel evaluation of ${models.length} models...`);
  }

  const modelResults = await Promise.all(
    models.map((model) =>
      evaluateModelClues(model, clues, {
        dbPath,
        weekId,
        apiKey,
        verbose,
        skipExisting,
      })
    )
  );

  // Aggregate results from all models
  let totalEvaluations = 0;
  let totalCorrect = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const result of modelResults) {
    totalEvaluations += result.evaluations;
    totalCorrect += result.correct;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
  }

  if (verbose) {
    console.log(`\n=== Summary ===`);
    console.log(`Total evaluations: ${totalEvaluations}`);
    console.log(`Total correct: ${totalCorrect}`);
    console.log(`Skipped (existing): ${totalSkipped}`);
    console.log(`Errors: ${totalErrors}`);
  }

  // Update metadata
  setMetadata(dbPath, 'last_evaluation_date', new Date().toISOString());

  // Calculate rankings
  if (calculateRankings && totalEvaluations > 0) {
    calculateWeeklyRankings(dbPath, weekId, verbose);
  }

  closeDb();
}

async function evaluateClue(
  clue: Clue,
  model: Model,
  weekId: string,
  apiKey: string,
  verbose: boolean
): Promise<Evaluation> {
  const messages = buildMessages(clue);

  try {
    const result = await createCompletion(apiKey, {
      model: model.openrouterId,
      messages,
      maxTokens: 50,
      temperature: 0,
    });

    const extractedAnswer = extractAnswer(result.content);
    const isCorrect = checkAnswer(result.content, clue.answer);

    if (verbose) {
      const status = isCorrect ? '✓' : '✗';
      console.log(`  ${status} "${clue.clueText}" ${clue.letterCount}`);
      console.log(`    Expected: ${clue.answer}, Got: ${extractedAnswer}`);
    }

    return {
      clueId: clue.id,
      modelId: model.id,
      weekId,
      modelResponse: result.content,
      extractedAnswer,
      isCorrect,
      responseTimeMs: result.responseTimeMs,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      errorMessage: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (verbose) {
      console.log(`  ✗ "${clue.clueText}" ${clue.letterCount}`);
      console.log(`    Error: ${errorMessage}`);
    }

    return {
      clueId: clue.id,
      modelId: model.id,
      weekId,
      modelResponse: null,
      extractedAnswer: null,
      isCorrect: false,
      responseTimeMs: null,
      tokensUsed: null,
      cost: null,
      errorMessage,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ModelEvalOptions {
  dbPath: string;
  weekId: string;
  apiKey: string;
  verbose: boolean;
  skipExisting: boolean;
}

interface ModelEvalResult {
  modelId: number;
  modelName: string;
  evaluations: number;
  correct: number;
  skipped: number;
  errors: number;
}

async function evaluateModelClues(
  model: Model,
  clues: Clue[],
  options: ModelEvalOptions
): Promise<ModelEvalResult> {
  const { dbPath, weekId, apiKey, verbose, skipExisting } = options;

  let evaluations = 0;
  let correct = 0;
  let skipped = 0;
  let errors = 0;

  if (verbose) {
    console.log(`\n=== ${model.displayName} (starting) ===`);
  }

  for (const clue of clues) {
    // Skip if already evaluated
    if (skipExisting && evaluationExists(dbPath, clue.id, model.id)) {
      skipped++;
      continue;
    }

    const evaluation = await evaluateClue(clue, model, weekId, apiKey, verbose);
    insertEvaluation(dbPath, evaluation);

    evaluations++;

    if (evaluation.isCorrect) {
      correct++;
    }

    if (evaluation.errorMessage) {
      errors++;
    }

    // Rate limiting between API calls (per model)
    await sleep(500);
  }

  if (verbose && evaluations > 0) {
    console.log(`  ${model.displayName} Result: ${correct}/${evaluations} (${((correct / evaluations) * 100).toFixed(1)}%)`);
  }

  return {
    modelId: model.id,
    modelName: model.displayName,
    evaluations,
    correct,
    skipped,
    errors,
  };
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options: EvaluateOptions = {
    verbose: true,
  };

  // Parse CLI arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && args[i + 1]) {
      options.dbPath = args[++i];
    } else if (args[i] === '--week' && args[i + 1]) {
      options.weekId = args[++i];
    } else if (args[i] === '--quiet') {
      options.verbose = false;
    } else if (args[i] === '--no-skip') {
      options.skipExisting = false;
    } else if (args[i] === '--no-rankings') {
      options.calculateRankings = false;
    }
  }

  evaluateWeek(options).catch((error) => {
    console.error('Evaluation failed:', error);
    process.exit(1);
  });
}
