import {
  LLM_CONFIG_DEFAULTS,
  LLMConfig,
} from '@server/repositories/llmConfigRepository';
import { renderConfigYaml } from '../templates/configYamlTemplate';

function makeConfig(overrides: Partial<LLMConfig>): LLMConfig {
  return {
    id: 1,
    ...LLM_CONFIG_DEFAULTS,
    ...overrides,
  };
}

describe('renderConfigYaml', () => {
  it.each([
    {
      name: 'openai/openai',
      config: makeConfig({
        chatProvider: 'openai',
        embeddingProvider: 'openai',
      }),
      llmModel: 'model: gpt-4.1-mini-2025-04-14',
      embeddingModel: 'model: text-embedding-3-large',
      embeddingDim: 'embedding_model_dim: 3072',
    },
    {
      name: 'openai/ollama',
      config: makeConfig({
        chatProvider: 'openai',
        embeddingProvider: 'ollama',
      }),
      llmModel: 'model: gpt-4.1-mini-2025-04-14',
      embeddingModel: 'model: ollama/nomic-embed-text',
      embeddingDim: 'embedding_model_dim: 768',
    },
    {
      name: 'ollama/openai',
      config: makeConfig({
        chatProvider: 'ollama',
        embeddingProvider: 'openai',
      }),
      llmModel: 'model: ollama/llama3',
      embeddingModel: 'model: text-embedding-3-large',
      embeddingDim: 'embedding_model_dim: 3072',
    },
    {
      name: 'ollama/ollama',
      config: makeConfig({
        chatProvider: 'ollama',
        embeddingProvider: 'ollama',
      }),
      llmModel: 'model: ollama/llama3',
      embeddingModel: 'model: ollama/nomic-embed-text',
      embeddingDim: 'embedding_model_dim: 768',
    },
  ])(
    'renders $name correctly',
    ({ config, llmModel, embeddingModel, embeddingDim }) => {
      const yaml = renderConfigYaml(config);

      expect(yaml).toContain(llmModel);
      expect(yaml).toContain(embeddingModel);
      expect(yaml).toContain(embeddingDim);
    },
  );
});
