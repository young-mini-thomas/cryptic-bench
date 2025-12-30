#!/usr/bin/env npx tsx
/**
 * Test script to validate all models work correctly with OpenRouter
 * Tests each model with a single cryptic clue and reports results
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// All models to test (both active and commented out from models.ts)
const ALL_MODELS = [
  // Anthropic
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5' },

  // Google
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash' },

  // OpenAI
  { id: 'openai/gpt-5.2', name: 'GPT-5.2' },

  // xAI
  { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast' },

  // DeepSeek
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2' },

  // Qwen
  { id: 'qwen/qwen3-max', name: 'Qwen3 Max' },

  // Mistral
  { id: 'mistralai/mistral-large-2512', name: 'Mistral Large 3' },

  // Meta
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },

  // Zhipu AI
  { id: 'z-ai/glm-4.7', name: 'GLM-4.7' },

  // MiniMax
  { id: 'minimax/minimax-m2.1', name: 'MiniMax M2.1' },
];

// Simple test clue with known answer
const TEST_CLUE = {
  text: 'Policeman\'s undercover operation',
  letterCount: '(5)',
  answer: 'STING',
};

const SYSTEM_PROMPT = `You are solving cryptic crossword clues. For each clue, provide ONLY the answer - no explanation, no punctuation, just the word(s). If the answer is multiple words, separate them with spaces.`;

interface TestResult {
  model: string;
  name: string;
  status: 'success' | 'error' | 'empty' | 'wrong';
  response?: string;
  error?: string;
  timeMs?: number;
  correct?: boolean;
}

async function testModel(apiKey: string, modelId: string, modelName: string): Promise<TestResult> {
  const startTime = Date.now();

  const requestBody: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Solve this cryptic crossword clue:\n\n"${TEST_CLUE.text}" ${TEST_CLUE.letterCount}\n\nAnswer:` },
    ],
    max_tokens: 4000, // Very high to allow full thinking + answer
    temperature: 0,
  };

  // Try to limit reasoning for Gemini models (they think forever otherwise)
  if (modelId.includes('gemini')) {
    requestBody.reasoning = { max_tokens: 1000 }; // Cap reasoning, leave room for answer
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/cryptic-bench',
        'X-Title': 'Cryptic-Bench-Test',
      },
      body: JSON.stringify(requestBody),
    });

    const timeMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        model: modelId,
        name: modelName,
        status: 'error',
        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        timeMs,
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        model: modelId,
        name: modelName,
        status: 'error',
        error: data.error.message,
        timeMs,
      };
    }

    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      return {
        model: modelId,
        name: modelName,
        status: 'empty',
        error: `Empty response. Raw: ${JSON.stringify(data.choices?.[0])}`,
        timeMs,
      };
    }

    // Check if answer is correct (case-insensitive)
    const normalized = content.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const correct = normalized === TEST_CLUE.answer;

    return {
      model: modelId,
      name: modelName,
      status: correct ? 'success' : 'wrong',
      response: content.trim(),
      correct,
      timeMs,
    };

  } catch (error) {
    return {
      model: modelId,
      name: modelName,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      timeMs: Date.now() - startTime,
    };
  }
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('Error: OPENROUTER_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('='.repeat(70));
  console.log('CRYPTIC-BENCH MODEL TEST');
  console.log('='.repeat(70));
  console.log(`\nTest clue: "${TEST_CLUE.text}" ${TEST_CLUE.letterCount}`);
  console.log(`Expected answer: ${TEST_CLUE.answer}\n`);
  console.log('Testing', ALL_MODELS.length, 'models...\n');

  const results: TestResult[] = [];

  for (const model of ALL_MODELS) {
    process.stdout.write(`Testing ${model.name.padEnd(20)} ... `);

    const result = await testModel(apiKey, model.id, model.name);
    results.push(result);

    // Print inline result
    if (result.status === 'success') {
      console.log(`✓ "${result.response}" (${result.timeMs}ms)`);
    } else if (result.status === 'wrong') {
      console.log(`✗ Got "${result.response}" (${result.timeMs}ms)`);
    } else if (result.status === 'empty') {
      console.log(`⚠ EMPTY RESPONSE (${result.timeMs}ms)`);
    } else {
      console.log(`✗ ERROR: ${result.error?.substring(0, 60)}...`);
    }

    // Small delay between requests to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const success = results.filter(r => r.status === 'success');
  const wrong = results.filter(r => r.status === 'wrong');
  const empty = results.filter(r => r.status === 'empty');
  const errors = results.filter(r => r.status === 'error');

  console.log(`\n✓ Working (correct answer): ${success.length}`);
  success.forEach(r => console.log(`    - ${r.name}`));

  console.log(`\n✗ Working (wrong answer): ${wrong.length}`);
  wrong.forEach(r => console.log(`    - ${r.name}: got "${r.response}"`));

  console.log(`\n⚠ Empty responses: ${empty.length}`);
  empty.forEach(r => console.log(`    - ${r.name}: ${r.error}`));

  console.log(`\n✗ Errors: ${errors.length}`);
  errors.forEach(r => console.log(`    - ${r.name}: ${r.error?.substring(0, 80)}`));

  // Exit with error if any failures
  if (empty.length > 0 || errors.length > 0) {
    process.exit(1);
  }
}

main();
