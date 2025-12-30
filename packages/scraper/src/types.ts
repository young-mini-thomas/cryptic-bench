// Guardian API response types
export interface GuardianCrosswordData {
  id: string;
  number: number;
  name: string;
  creator?: {
    name: string;
    webUrl: string;
  };
  date: number; // Unix timestamp in milliseconds
  entries: GuardianEntry[];
  solutionAvailable: boolean;
  dateSolutionAvailable?: number;
  dimensions: {
    cols: number;
    rows: number;
  };
  crosswordType: string;
}

export interface GuardianEntry {
  id: string;
  number: number;
  humanNumber: string;
  clue: string;
  direction: 'across' | 'down';
  length: number;
  group: string[];
  position: { x: number; y: number };
  separatorLocations: Record<string, number[]>;
  solution?: string;
}

// Our internal types
export interface Puzzle {
  guardianId: number;
  puzzleType: string;
  setter: string | null;
  publicationDate: string;
  weekId: string;
  rawJson: string;
}

export interface Clue {
  puzzleId: number;
  clueNumber: string;
  direction: 'across' | 'down';
  clueText: string;
  answer: string;
  letterCount: string;
}

export interface ScrapedPuzzle {
  puzzle: Puzzle;
  clues: Omit<Clue, 'puzzleId'>[];
}
