import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DEFAULT_MODELS } from '../packages/evaluator/src/models.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, '../data/cryptic-bench.db');

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create schema
db.exec(`
-- Puzzles from Guardian
CREATE TABLE IF NOT EXISTS puzzles (
    id INTEGER PRIMARY KEY,
    guardian_id INTEGER UNIQUE NOT NULL,
    puzzle_type TEXT NOT NULL DEFAULT 'cryptic',
    setter TEXT,
    publication_date DATE NOT NULL,
    week_id TEXT NOT NULL,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_puzzles_week ON puzzles(week_id);
CREATE INDEX IF NOT EXISTS idx_puzzles_date ON puzzles(publication_date);

-- Individual clues
CREATE TABLE IF NOT EXISTS clues (
    id INTEGER PRIMARY KEY,
    puzzle_id INTEGER NOT NULL REFERENCES puzzles(id),
    clue_number TEXT NOT NULL,
    direction TEXT NOT NULL,
    clue_text TEXT NOT NULL,
    answer TEXT NOT NULL,
    letter_count TEXT NOT NULL,
    UNIQUE(puzzle_id, clue_number, direction)
);

CREATE INDEX IF NOT EXISTS idx_clues_puzzle ON clues(puzzle_id);

-- Model registry
CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY,
    openrouter_id TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual evaluations
CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY,
    clue_id INTEGER NOT NULL REFERENCES clues(id),
    model_id INTEGER NOT NULL REFERENCES models(id),
    week_id TEXT NOT NULL,
    model_response TEXT,
    extracted_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    response_time_ms INTEGER,
    tokens_used INTEGER,
    error_message TEXT,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(clue_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluations_model ON evaluations(model_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_week ON evaluations(week_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_correct ON evaluations(is_correct);

-- Weekly aggregated rankings
CREATE TABLE IF NOT EXISTS weekly_rankings (
    id INTEGER PRIMARY KEY,
    week_id TEXT NOT NULL,
    model_id INTEGER NOT NULL REFERENCES models(id),
    total_clues INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    accuracy REAL NOT NULL,
    rank INTEGER NOT NULL,
    previous_rank INTEGER,
    rank_change INTEGER,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(week_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_rankings_week ON weekly_rankings(week_id);
CREATE INDEX IF NOT EXISTS idx_rankings_model ON weekly_rankings(model_id);

-- Tenure tracking
CREATE TABLE IF NOT EXISTS rank_tenure (
    id INTEGER PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id),
    rank_position INTEGER NOT NULL,
    start_week TEXT NOT NULL,
    end_week TEXT,
    weeks_count INTEGER NOT NULL DEFAULT 1,
    is_current BOOLEAN DEFAULT TRUE,
    UNIQUE(model_id, rank_position, start_week)
);

CREATE INDEX IF NOT EXISTS idx_tenure_model ON rank_tenure(model_id);
CREATE INDEX IF NOT EXISTS idx_tenure_current ON rank_tenure(is_current);

-- Metadata table
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

// Insert initial metadata
const insertMetadata = db.prepare(`
  INSERT OR IGNORE INTO metadata (key, value) VALUES (?, ?)
`);
insertMetadata.run('schema_version', '1');
insertMetadata.run('last_scrape_date', null);
insertMetadata.run('last_evaluation_date', null);
insertMetadata.run('last_scraped_puzzle_id', null);

// Sync models from models.ts (single source of truth)
// 1. Deactivate all models
// 2. Upsert models from DEFAULT_MODELS and activate them
db.prepare(`UPDATE models SET is_active = 0`).run();

const upsertModel = db.prepare(`
  INSERT INTO models (openrouter_id, provider, model_name, display_name, is_active)
  VALUES (?, ?, ?, ?, 1)
  ON CONFLICT(openrouter_id) DO UPDATE SET
    provider = excluded.provider,
    model_name = excluded.model_name,
    display_name = excluded.display_name,
    is_active = 1
`);

for (const model of DEFAULT_MODELS) {
  upsertModel.run(model.openrouterId, model.provider, model.modelName, model.displayName);
}

db.close();

console.log(`Database initialized at: ${dbPath}`);
console.log(`Synced ${DEFAULT_MODELS.length} active models`);
