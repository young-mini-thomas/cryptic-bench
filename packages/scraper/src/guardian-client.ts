// Fetch clues from cryptics.georgeho.org dataset
// This dataset contains Guardian clues via Fifteensquared blog analysis

const API_BASE = 'https://cryptics.georgeho.org';
const USER_AGENT = 'CrypticBench/1.0 (https://github.com/yourusername/cryptic-bench)';

export interface DatasetClue {
  rowid: number;
  clue: string;
  answer: string;
  definition: string | null;
  clue_number: string | null;
  puzzle_date: string;
  puzzle_name: string;
  source_url: string;
  source: string;
}

interface DatasetResponse {
  rows: Array<[number, string, string, string | null, string | null, string, string, string, string]>;
  columns: string[];
  truncated: boolean;
  next?: string;
  next_url?: string;
}

function parseRow(row: DatasetResponse['rows'][0]): DatasetClue {
  return {
    rowid: row[0],
    clue: row[1],
    answer: row[2],
    definition: row[3],
    clue_number: row[4],
    puzzle_date: row[5],
    puzzle_name: row[6],
    source_url: row[7],
    source: row[8],
  };
}

/**
 * Fetch Guardian clues from the cryptics dataset API
 * Source: fifteensquared contains Guardian crossword analysis
 */
export async function fetchGuardianClues(options: {
  limit?: number;
  afterDate?: string;
  puzzleName?: string;
}): Promise<DatasetClue[]> {
  const { limit = 100, afterDate, puzzleName } = options;

  // Build query URL - filter for Guardian source (fifteensquared)
  let url = `${API_BASE}/data/clues.json?_size=${limit}&source=fifteensquared`;

  // Filter by puzzle name if specified (e.g., "Guardian 29349")
  if (puzzleName) {
    url += `&puzzle_name__contains=${encodeURIComponent(puzzleName)}`;
  }

  // Filter by date if specified
  if (afterDate) {
    url += `&puzzle_date__gte=${encodeURIComponent(afterDate)}`;
  }

  // Sort by most recent first
  url += '&_sort_desc=puzzle_date';

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status} for ${url}`);
      return [];
    }

    const data = (await response.json()) as DatasetResponse;

    if (!data.rows) {
      console.error('Invalid response from dataset API');
      return [];
    }

    return data.rows.map(parseRow);
  } catch (error) {
    console.error('Error fetching clues:', error);
    return [];
  }
}

/**
 * Fetch a single puzzle's clues by puzzle name
 */
export async function fetchPuzzleClues(puzzleName: string): Promise<DatasetClue[]> {
  const url = `${API_BASE}/data/clues.json?puzzle_name=${encodeURIComponent(puzzleName)}&_size=100`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as DatasetResponse;
    return (data.rows || []).map(parseRow);
  } catch {
    return [];
  }
}

/**
 * Get list of recent Guardian puzzles
 */
export async function getRecentPuzzles(limit = 10): Promise<string[]> {
  const url = `${API_BASE}/data/clues.json?_size=1000&source=fifteensquared&_sort_desc=puzzle_date`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as DatasetResponse;
    const clues = (data.rows || []).map(parseRow);

    // Extract unique puzzle names
    const puzzleNames = new Set<string>();
    for (const clue of clues) {
      if (clue.puzzle_name && clue.puzzle_name.toLowerCase().includes('guardian')) {
        puzzleNames.add(clue.puzzle_name);
        if (puzzleNames.size >= limit) break;
      }
    }

    return [...puzzleNames];
  } catch {
    return [];
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
