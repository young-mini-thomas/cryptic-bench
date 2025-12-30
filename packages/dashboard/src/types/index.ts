export interface Model {
  id: number;
  openrouterId: string;
  provider: string;
  modelName: string;
  displayName: string;
  isActive: boolean;
}

export interface WeeklyRanking {
  weekId: string;
  modelId: number;
  displayName: string;
  provider: string;
  totalClues: number;
  correctCount: number;
  accuracy: number;
  rank: number;
  previousRank: number | null;
  rankChange: number | null;
  tenureWeeks: number | null;
}

export interface ClueResult {
  clueId: number;
  clueText: string;
  letterCount: string;
  answer: string;
  modelResponse: string | null;
  extractedAnswer: string | null;
  isCorrect: boolean;
  setter: string | null;
}

export interface WeekSummary {
  weekId: string;
  puzzleCount: number;
  clueCount: number;
  modelCount: number;
}

export interface PuzzleInfo {
  id: number;
  setter: string | null;
  url: string | null;
  title: string | null;
}
