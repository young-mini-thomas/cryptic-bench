# Cryptic-Bench

A weekly benchmark testing frontier LLMs on their ability to solve cryptic crossword clues.

## Overview

Cryptic crosswords are a uniquely challenging test of language understanding, requiring:
- Wordplay and lateral thinking
- Recognition of cryptic indicators (anagrams, hidden words, homophones, etc.)
- Cultural knowledge and vocabulary
- Parsing misleading surface readings

Cryptic-Bench evaluates leading AI models on fresh Guardian cryptic crossword puzzles each week, providing a live leaderboard that tracks which models are best at this distinctly human linguistic challenge.

## How It Works

1. **Weekly Scraping**: Each week, we fetch a fresh Guardian cryptic crossword (~30 clues)
2. **Evaluation**: Each clue is sent to all tracked models via OpenRouter
3. **Scoring**: Answers are compared case-insensitively to the correct solutions
4. **Ranking**: Models are ranked by accuracy percentage
5. **Tracking**: We track how long each model holds each ranking position

## Leaderboard Features

- **Current Rankings**: See which model is #1 this week
- **Tenure Tracking**: "Claude has been #1 for 5 weeks"
- **Movement Indicators**: See which models moved up or down from last week
- **Drill-down**: View which specific clues each model got right or wrong

## Example Clue

```
Clue: "Composer's final piece sent back for repairs" (6)
Answer: MENDER

Explanation:
- "Composer" = END (as in "the end" of a piece)
- "final piece" = R (last letter)
- "sent back" = reverse indicator
- ENDER reversed = REDNE... wait, that's not right
- Actually: "Composer" could clue ENDER, reversed = REDNE + M?
- The cryptic logic varies - that's what makes it hard!
```

## Models Evaluated

### Anthropic
- Claude Opus 4
- Claude Sonnet 4
- Claude 3.5 Sonnet
- Claude 3.5 Haiku

### OpenAI
- GPT-4o
- o1
- o1-mini

### Google
- Gemini 2.0 Flash
- Gemini Exp

### xAI
- Grok 2

### Open Source
- DeepSeek V3
- Qwen 2.5 72B

## Tech Stack

- **Frontend**: React + Vite (static site)
- **Database**: SQLite (read in browser via sql.js)
- **LLM API**: OpenRouter (unified access to all models)
- **Scraping**: Node.js with Cheerio
- **Hosting**: GitHub Pages
- **Automation**: GitHub Actions (weekly runs)

## Project Structure

```
cryptic-bench/
├── data/                    # SQLite database
├── packages/
│   ├── scraper/            # Guardian crossword scraper
│   ├── evaluator/          # LLM evaluation pipeline
│   └── dashboard/          # React frontend
├── scripts/
│   ├── init-db.ts          # Database initialization
│   └── run-weekly.ts       # Weekly orchestration
└── .github/workflows/      # GitHub Actions
```

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/cryptic-bench.git
cd cryptic-bench

# Install dependencies
npm install

# Initialize the database
npm run init-db

# Copy environment file and add your OpenRouter API key
cp .env.example .env
```

### Running Locally

```bash
# Scrape latest puzzles
npm run scrape

# Run evaluations (requires OPENROUTER_API_KEY)
npm run evaluate

# Start the dashboard dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `DATABASE_PATH` | Path to SQLite database (default: `./data/cryptic-bench.db`) |

## Data Sources

Puzzles are sourced from the [cryptics.georgeho.org](https://cryptics.georgeho.org/) dataset, which aggregates Guardian cryptic crossword clues from the Fifteensquared blog. This provides access to over 200,000 Guardian clues with verified answers.

For future development, direct Guardian scraping may be added when their new frontend rendering is better understood.

## Evaluation Methodology

### Prompt Format

Each model receives the same prompt:

```
System: You are solving cryptic crossword clues.
For each clue, provide ONLY the answer - no explanation, no punctuation, just the word(s).

User: Solve this cryptic crossword clue:
"[clue text]" ([letter count])

Answer:
```

### Answer Checking

- Case-insensitive comparison
- Punctuation and extra whitespace stripped
- Exact match required (no partial credit)

### Fairness

- All models receive identical prompts
- Fresh puzzles each week (no training data contamination)
- Same temperature settings across models
- Results published with full transparency

## Weekly Schedule

- **Sunday 6 AM UTC**: GitHub Action runs
  1. Scrapes the latest Guardian cryptic
  2. Evaluates all models
  3. Calculates rankings
  4. Deploys updated dashboard

## Contributing

Contributions welcome! Areas of interest:

- Adding new model providers
- Improving answer extraction from model responses
- Dashboard UI enhancements
- Additional crossword sources

## License

MIT

## Acknowledgments

- [The Guardian](https://www.theguardian.com/crosswords) for their excellent free cryptic crosswords
- [OpenRouter](https://openrouter.ai/) for unified LLM API access
- The cryptic crossword community for keeping this art form alive
