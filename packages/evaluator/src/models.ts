// Default models to evaluate via OpenRouter
// These can be overridden by the database
// Updated based on LMSYS/LMArena leaderboard rankings (December 2025)
// Only includes the latest iteration of each model type

export const DEFAULT_MODELS = [
  // Anthropic
  {
    openrouterId: 'anthropic/claude-opus-4.5',
    provider: 'anthropic',
    modelName: 'Claude Opus 4.5',
    displayName: 'Claude Opus 4.5',
  },
  {
    openrouterId: 'anthropic/claude-sonnet-4.5',
    provider: 'anthropic',
    modelName: 'Claude Sonnet 4.5',
    displayName: 'Claude Sonnet 4.5',
  },
  {
    openrouterId: 'anthropic/claude-haiku-4.5',
    provider: 'anthropic',
    modelName: 'Claude Haiku 4.5',
    displayName: 'Claude Haiku 4.5',
  },

  // Google
  {
    openrouterId: 'google/gemini-3-pro-preview',
    provider: 'google',
    modelName: 'Gemini 3 Pro',
    displayName: 'Gemini 3 Pro',
  },
  {
    openrouterId: 'google/gemini-3-flash-preview',
    provider: 'google',
    modelName: 'Gemini 3 Flash',
    displayName: 'Gemini 3 Flash',
  },

  // OpenAI
  {
    openrouterId: 'openai/gpt-5.2',
    provider: 'openai',
    modelName: 'GPT-5.2',
    displayName: 'GPT-5.2',
  },
  {
    openrouterId: 'openai/o3',
    provider: 'openai',
    modelName: 'o3',
    displayName: 'o3',
  },

  // xAI
  {
    openrouterId: 'x-ai/grok-4.1-fast',
    provider: 'xai',
    modelName: 'Grok 4.1 Fast',
    displayName: 'Grok 4.1 Fast',
  },

  // DeepSeek
  {
    openrouterId: 'deepseek/deepseek-v3.2',
    provider: 'deepseek',
    modelName: 'DeepSeek V3.2',
    displayName: 'DeepSeek V3.2',
  },

  // Qwen
  {
    openrouterId: 'qwen/qwen3-max',
    provider: 'qwen',
    modelName: 'Qwen3 Max',
    displayName: 'Qwen3 Max',
  },

  // Mistral
  {
    openrouterId: 'mistralai/mistral-large-2512',
    provider: 'mistral',
    modelName: 'Mistral Large 3',
    displayName: 'Mistral Large 3',
  },

  // Meta
  {
    openrouterId: 'meta-llama/llama-3.3-70b-instruct',
    provider: 'meta',
    modelName: 'Llama 3.3 70B',
    displayName: 'Llama 3.3 70B',
  },

  // Zhipu AI (Z.AI)
  {
    openrouterId: 'z-ai/glm-4.7',
    provider: 'zhipu',
    modelName: 'GLM-4.7',
    displayName: 'GLM-4.7',
  },

  // MiniMax
  {
    openrouterId: 'minimax/minimax-m2.1',
    provider: 'minimax',
    modelName: 'MiniMax M2.1',
    displayName: 'MiniMax M2.1',
  },
] as const;

export type ModelConfig = (typeof DEFAULT_MODELS)[number];