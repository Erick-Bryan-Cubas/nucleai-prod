import {
  buildLLMConfigPayload,
  hasEmbeddingConfigChanged,
} from './llmSettingsHelpers';

describe('llmSettingsHelpers', () => {
  it('builds a mixed payload for OpenAI chat and Ollama embeddings', () => {
    const payload = buildLLMConfigPayload({
      chatProvider: 'openai',
      embeddingProvider: 'ollama',
      openaiModel: 'gpt-4.1-mini-2025-04-14',
      ollamaEndpoint: 'http://host.docker.internal:11434',
      ollamaEmbeddingModel: 'nomic-embed-text',
      ollamaEmbeddingDim: 768,
    });

    expect(payload).toEqual({
      chatProvider: 'openai',
      embeddingProvider: 'ollama',
      openaiModel: 'gpt-4.1-mini-2025-04-14',
      ollamaEndpoint: 'http://host.docker.internal:11434',
      ollamaEmbeddingModel: 'nomic-embed-text',
      ollamaEmbeddingDim: 768,
    });
  });

  it('does not flag chat-only changes as embedding changes', () => {
    const changed = hasEmbeddingConfigChanged(
      {
        chatProvider: 'openai',
        embeddingProvider: 'openai',
        openaiModel: 'gpt-4.1-mini-2025-04-14',
        openaiEmbeddingModel: 'text-embedding-3-large',
        openaiEmbeddingDim: 3072,
        ollamaEndpoint: 'http://host.docker.internal:11434',
        ollamaModel: 'llama3',
        ollamaEmbeddingModel: 'nomic-embed-text',
        ollamaEmbeddingDim: 768,
      },
      { openaiModel: 'gpt-5-mini-2025-08-07' },
    );

    expect(changed).toBe(false);
  });

  it('flags embedding changes in mixed configurations', () => {
    const changed = hasEmbeddingConfigChanged(
      {
        chatProvider: 'openai',
        embeddingProvider: 'ollama',
        openaiModel: 'gpt-4.1-mini-2025-04-14',
        openaiEmbeddingModel: 'text-embedding-3-large',
        openaiEmbeddingDim: 3072,
        ollamaEndpoint: 'http://host.docker.internal:11434',
        ollamaModel: 'llama3',
        ollamaEmbeddingModel: 'nomic-embed-text',
        ollamaEmbeddingDim: 768,
      },
      { ollamaEmbeddingModel: 'mxbai-embed-large' },
    );

    expect(changed).toBe(true);
  });
});
