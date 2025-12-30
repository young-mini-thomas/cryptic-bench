export interface Clue {
  id: number;
  puzzleId: number;
  clueNumber: string;
  direction: 'across' | 'down';
  clueText: string;
  answer: string;
  letterCount: string;
}

export interface Model {
  id: number;
  openrouterId: string;
  provider: string;
  modelName: string;
  displayName: string;
  isActive: boolean;
}

export interface Evaluation {
  clueId: number;
  modelId: number;
  weekId: string;
  modelResponse: string | null;
  extractedAnswer: string | null;
  isCorrect: boolean;
  responseTimeMs: number | null;
  tokensUsed: number | null;
  errorMessage: string | null;
}

export interface WeeklyRanking {
  weekId: string;
  modelId: number;
  totalClues: number;
  correctCount: number;
  accuracy: number;
  rank: number;
  previousRank: number | null;
  rankChange: number | null;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    code: string;
  };
}
