import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Insert default models
const insertModel = db.prepare(`
  INSERT OR IGNORE INTO models (openrouter_id, provider, model_name, display_name)
  VALUES (?, ?, ?, ?)
`);

const models = [
  // Anthropic
  ['anthropic/claude-opus-4-20250514', 'anthropic', 'Claude Opus 4', 'Claude Opus 4'],
  ['anthropic/claude-sonnet-4-20250514', 'anthropic', 'Claude Sonnet 4', 'Claude Sonnet 4'],
  ['anthropic/claude-3.5-sonnet', 'anthropic', 'Claude 3.5 Sonnet', 'Claude 3.5 Sonnet'],
  ['anthropic/claude-3.5-haiku', 'anthropic', 'Claude 3.5 Haiku', 'Claude 3.5 Haiku'],

  // OpenAI
  ['openai/gpt-4o', 'openai', 'GPT-4o', 'GPT-4o'],
  ['openai/o1', 'openai', 'o1', 'o1'],
  ['openai/o1-mini', 'openai', 'o1-mini', 'o1-mini'],

  // Google
  ['google/gemini-2.0-flash-exp:free', 'google', 'Gemini 2.0 Flash', 'Gemini 2.0 Flash'],
  ['google/gemini-exp-1206:free', 'google', 'Gemini Exp', 'Gemini Exp'],

  // xAI
  ['x-ai/grok-2-1212', 'xai', 'Grok 2', 'Grok 2'],

  // Open source
  ['deepseek/deepseek-chat', 'deepseek', 'DeepSeek V3', 'DeepSeek V3'],
  ['qwen/qwen-2.5-72b-instruct', 'qwen', 'Qwen 2.5 72B', 'Qwen 2.5 72B'],
];

for (const [openrouterId, provider, modelName, displayName] of models) {
  insertModel.run(openrouterId, provider, modelName, displayName);
}

db.close();

console.log(`Database initialized at: ${dbPath}`);
console.log(`Inserted ${models.length} default models`);
