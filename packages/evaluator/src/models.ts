// Default models to evaluate via OpenRouter
// These can be overridden by the database

export const DEFAULT_MODELS = [
  // Anthropic
  {
    openrouterId: 'anthropic/claude-opus-4-20250514',
    provider: 'anthropic',
    modelName: 'Claude Opus 4',
    displayName: 'Claude Opus 4',
  },
  {
    openrouterId: 'anthropic/claude-sonnet-4-20250514',
    provider: 'anthropic',
    modelName: 'Claude Sonnet 4',
    displayName: 'Claude Sonnet 4',
  },
  {
    openrouterId: 'anthropic/claude-3.5-sonnet',
    provider: 'anthropic',
    modelName: 'Claude 3.5 Sonnet',
    displayName: 'Claude 3.5 Sonnet',
  },
  {
    openrouterId: 'anthropic/claude-3.5-haiku',
    provider: 'anthropic',
    modelName: 'Claude 3.5 Haiku',
    displayName: 'Claude 3.5 Haiku',
  },

  // OpenAI
  {
    openrouterId: 'openai/gpt-4o',
    provider: 'openai',
    modelName: 'GPT-4o',
    displayName: 'GPT-4o',
  },
  {
    openrouterId: 'openai/o1',
    provider: 'openai',
    modelName: 'o1',
    displayName: 'o1',
  },
  {
    openrouterId: 'openai/o1-mini',
    provider: 'openai',
    modelName: 'o1-mini',
    displayName: 'o1-mini',
  },

  // Google
  {
    openrouterId: 'google/gemini-2.0-flash-exp:free',
    provider: 'google',
    modelName: 'Gemini 2.0 Flash',
    displayName: 'Gemini 2.0 Flash',
  },
  {
    openrouterId: 'google/gemini-exp-1206:free',
    provider: 'google',
    modelName: 'Gemini Exp',
    displayName: 'Gemini Exp',
  },

  // xAI
  {
    openrouterId: 'x-ai/grok-2-1212',
    provider: 'xai',
    modelName: 'Grok 2',
    displayName: 'Grok 2',
  },

  // Open source
  {
    openrouterId: 'deepseek/deepseek-chat',
    provider: 'deepseek',
    modelName: 'DeepSeek V3',
    displayName: 'DeepSeek V3',
  },
  {
    openrouterId: 'qwen/qwen-2.5-72b-instruct',
    provider: 'qwen',
    modelName: 'Qwen 2.5 72B',
    displayName: 'Qwen 2.5 72B',
  },
] as const;

export type ModelConfig = (typeof DEFAULT_MODELS)[number];
