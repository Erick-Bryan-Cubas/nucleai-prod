import * as fs from 'fs/promises';
import {
  LLM_CONFIG_DEFAULTS,
  LLMConfig,
} from '@server/repositories/llmConfigRepository';
import { LLMConfigService } from '../llmConfigService';

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  rename: jest.fn(),
}));

function makeConfig(overrides: Partial<LLMConfig> = {}): LLMConfig {
  return {
    id: 1,
    ...LLM_CONFIG_DEFAULTS,
    openaiApiKeyEncrypted: 'encrypted-key',
    ...overrides,
  };
}

describe('LLMConfigService', () => {
  let repo: any;
  let encryptor: any;
  let wrenAIAdaptor: any;
  let service: LLMConfigService;

  beforeEach(() => {
    repo = {
      findSingleton: jest.fn(),
      updateSingleton: jest.fn(),
    };
    encryptor = {
      encrypt: jest.fn().mockReturnValue('encrypted-key'),
      decrypt: jest
        .fn()
        .mockReturnValue(JSON.stringify({ apiKey: 'stored-openai-key' })),
    };
    wrenAIAdaptor = {
      reloadConfig: jest.fn().mockResolvedValue({
        ok: true,
        llmModel: 'ollama/llama3',
        embeddingModel: 'text-embedding-3-large',
      }),
    };
    service = new LLMConfigService(repo, encryptor, wrenAIAdaptor);
    (global as any).fetch = jest.fn();
    jest.clearAllMocks();
  });

  it('tests chat connection using chatProvider even in mixed mode', async () => {
    repo.findSingleton.mockResolvedValue(
      makeConfig({
        chatProvider: 'openai',
        embeddingProvider: 'ollama',
      }),
    );
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
    });

    const result = await service.testConnection('CHAT', {});

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer stored-openai-key' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('tests embedding connection using embeddingProvider even in mixed mode', async () => {
    repo.findSingleton.mockResolvedValue(
      makeConfig({
        chatProvider: 'openai',
        embeddingProvider: 'ollama',
        ollamaEmbeddingModel: 'nomic-embed-text',
      }),
    );
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] }),
      })
      .mockResolvedValue({
        ok: true,
      });

    const result = await service.testConnection('EMBEDDING', {});

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://host.docker.internal:11434/api/embed',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('writes OPENAI_API_KEY when only embeddings use OpenAI and returns reload metadata', async () => {
    const updated = makeConfig({
      chatProvider: 'ollama',
      embeddingProvider: 'openai',
      ollamaModel: 'llama3',
      openaiEmbeddingModel: 'text-embedding-3-large',
    });
    repo.updateSingleton.mockResolvedValue(updated);

    const result = await service.updateConfig({
      chatProvider: 'ollama',
      embeddingProvider: 'openai',
    });

    expect(result.reload).toEqual({
      ok: true,
      llmModel: 'ollama/llama3',
      embeddingModel: 'text-embedding-3-large',
    });
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('.env.runtime.tmp'),
      expect.stringContaining('OPENAI_API_KEY=stored-openai-key'),
      { mode: 0o600 },
    );
  });
});
