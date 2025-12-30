import type { OpenRouterResponse } from './types.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEBUG = process.env.DEBUG_OPENROUTER === 'true';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CompletionOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

interface CompletionResult {
  content: string;
  tokensUsed: number;
  responseTimeMs: number;
  cost: number;
}

export async function createCompletion(
  apiKey: string,
  options: CompletionOptions
): Promise<CompletionResult> {
  const { model, messages, maxTokens = 100, temperature = 0 } = options;

  const startTime = Date.now();

  // Allow thinking/reasoning for all models - fair comparison
  // Models that support extended thinking will use it
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    usage: { include: true }, // Request cost information from OpenRouter
  };

  // Gemini models need capped reasoning or they think forever without answering
  if (model.includes('gemini')) {
    requestBody.reasoning = { max_tokens: 1000 };
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/yourusername/cryptic-bench',
      'X-Title': 'Cryptic-Bench',
    },
    body: JSON.stringify(requestBody),
  });

  const responseTimeMs = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  if (DEBUG) {
    console.log(`[DEBUG] ${model} raw response:`, JSON.stringify(data, null, 2));
  }

  if (data.error) {
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || 0;
  const cost = data.usage?.cost || 0;

  // Treat empty responses as errors so they get retried on next run
  if (!content) {
    const debugInfo = JSON.stringify({
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      firstChoice: data.choices?.[0],
      usage: data.usage,
    });
    throw new Error(`Empty response from ${model}. Debug: ${debugInfo}`);
  }

  return {
    content,
    tokensUsed,
    responseTimeMs,
    cost,
  };
}

export async function testConnection(apiKey: string): Promise<boolean> {
  try {
    await createCompletion(apiKey, {
      model: 'openai/gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "ok"' }],
      maxTokens: 5,
    });
    return true;
  } catch {
    return false;
  }
}
