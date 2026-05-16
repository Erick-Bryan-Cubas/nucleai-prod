export type LLMProvider = 'openai' | 'ollama';
export type LLMConnectionTarget = 'CHAT' | 'EMBEDDING';
type LLMProviderSnapshot = LLMProvider | string;

export interface LLMSettingsConfigSnapshot {
  chatProvider: LLMProviderSnapshot;
  embeddingProvider: LLMProviderSnapshot;
  openaiModel: string;
  openaiEmbeddingModel: string;
  openaiEmbeddingDim: number;
  ollamaEndpoint: string;
  ollamaModel: string;
  ollamaEmbeddingModel: string;
  ollamaEmbeddingDim: number;
}

export interface LLMSettingsFormValues {
  chatProvider?: LLMProvider;
  embeddingProvider?: LLMProvider;
  openaiApiKey?: string | null;
  openaiModel?: string;
  openaiEmbeddingModel?: string;
  openaiEmbeddingDim?: number;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  ollamaEmbeddingModel?: string;
  ollamaEmbeddingDim?: number;
}

export const OPENAI_CHAT_MODELS = [
  'gpt-4.1-nano-2025-04-14',
  'gpt-4.1-mini-2025-04-14',
  'gpt-4.1-2025-04-14',
  'gpt-5-nano-2025-08-07',
  'gpt-5-mini-2025-08-07',
  'gpt-5-2025-08-07',
].map((model) => ({ label: model, value: model }));

export const OPENAI_EMBEDDING_MODELS = [
  {
    label: 'text-embedding-3-large (3072 dims)',
    value: 'text-embedding-3-large',
    dim: 3072,
  },
  {
    label: 'text-embedding-3-small (1536 dims)',
    value: 'text-embedding-3-small',
    dim: 1536,
  },
];

export function stripEmpty<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== '') {
      (out as any)[key] = value;
    }
  }
  return out;
}

export function buildLLMConfigPayload(
  values: LLMSettingsFormValues,
): Partial<LLMSettingsFormValues> {
  const data = stripEmpty(values);

  if (data.embeddingProvider === 'openai' && data.openaiEmbeddingModel) {
    const embeddingModel = OPENAI_EMBEDDING_MODELS.find(
      (model) => model.value === data.openaiEmbeddingModel,
    );
    if (embeddingModel) {
      data.openaiEmbeddingDim = embeddingModel.dim;
    }
  }

  return data;
}

export function hasEmbeddingConfigChanged(
  current: LLMSettingsConfigSnapshot,
  nextInput: Partial<LLMSettingsFormValues>,
): boolean {
  const next = {
    embeddingProvider: nextInput.embeddingProvider ?? current.embeddingProvider,
    openaiEmbeddingModel:
      nextInput.openaiEmbeddingModel ?? current.openaiEmbeddingModel,
    openaiEmbeddingDim:
      nextInput.openaiEmbeddingDim ?? current.openaiEmbeddingDim,
    ollamaEndpoint: nextInput.ollamaEndpoint ?? current.ollamaEndpoint,
    ollamaEmbeddingModel:
      nextInput.ollamaEmbeddingModel ?? current.ollamaEmbeddingModel,
    ollamaEmbeddingDim:
      nextInput.ollamaEmbeddingDim ?? current.ollamaEmbeddingDim,
  };

  if (next.embeddingProvider !== current.embeddingProvider) {
    return true;
  }

  if (next.embeddingProvider === 'openai') {
    return (
      next.openaiEmbeddingModel !== current.openaiEmbeddingModel ||
      next.openaiEmbeddingDim !== current.openaiEmbeddingDim
    );
  }

  return (
    next.ollamaEndpoint !== current.ollamaEndpoint ||
    next.ollamaEmbeddingModel !== current.ollamaEmbeddingModel ||
    next.ollamaEmbeddingDim !== current.ollamaEmbeddingDim
  );
}
