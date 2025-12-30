import type { Clue } from './types.js';

const SYSTEM_PROMPT = `You are solving cryptic crossword clues. For each clue, provide ONLY the answer - no explanation, no punctuation, just the word(s). If the answer is multiple words, separate them with spaces.`;

export function buildPrompt(clue: Clue): { system: string; user: string } {
  const user = `Solve this cryptic crossword clue:

"${clue.clueText}" ${clue.letterCount}

Answer:`;

  return {
    system: SYSTEM_PROMPT,
    user,
  };
}

export function buildMessages(clue: Clue): Array<{ role: 'system' | 'user'; content: string }> {
  const { system, user } = buildPrompt(clue);

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
