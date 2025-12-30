/**
 * Extract the answer from a model's response.
 * Models often include explanations or extra text - we need just the answer.
 */
export function extractAnswer(response: string): string {
  // Trim and get first line (answer is usually first)
  let answer = response.trim().split('\n')[0];

  // Remove common prefixes
  answer = answer
    .replace(/^(answer|the answer is|solution|the solution is)[:\s]*/i, '')
    .replace(/^["']|["']$/g, '') // Remove quotes
    .trim();

  // Normalize: uppercase, remove non-alpha except spaces
  answer = answer
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return answer;
}

/**
 * Check if the extracted answer matches the correct answer.
 * Case-insensitive, ignores punctuation and extra whitespace.
 */
export function checkAnswer(modelAnswer: string, correctAnswer: string): boolean {
  const extracted = extractAnswer(modelAnswer);
  const correct = correctAnswer
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return extracted === correct;
}

/**
 * Calculate similarity between two answers for debugging.
 * Returns a value between 0 and 1.
 */
export function answerSimilarity(answer1: string, answer2: string): number {
  const a = answer1.toUpperCase().replace(/[^A-Z]/g, '');
  const b = answer2.toUpperCase().replace(/[^A-Z]/g, '');

  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Simple character overlap
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = [...setA].filter((c) => setB.has(c)).length;
  const union = new Set([...setA, ...setB]).size;

  return intersection / union;
}
