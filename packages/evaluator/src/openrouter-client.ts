import type { OpenRouterResponse } from './types.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
}

export async function createCompletion(
  apiKey: string,
  options: CompletionOptions
): Promise<CompletionResult> {
  const { model, messages, maxTokens = 100, temperature = 0 } = options;

  const startTime = Date.now();

  // Only disable reasoning for Claude models (they have extended thinking by default)
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  if (model.startsWith('anthropic/')) {
    requestBody.reasoning = { effort: 'none' };
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

  if (data.error) {
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || 0;

  return {
    content,
    tokensUsed,
    responseTimeMs,
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
