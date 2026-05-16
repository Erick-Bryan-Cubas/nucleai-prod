import { Knex } from 'knex';
import { BaseRepository, IBasicRepository } from './baseRepository';

export interface LLMConfig {
  id: number;
  provider: string; // legacy singleton provider, kept for migration compatibility
  chatProvider: string; // 'openai' | 'ollama'
  embeddingProvider: string; // 'openai' | 'ollama'
  openaiApiKeyEncrypted: string | null;
  openaiModel: string;
  openaiEmbeddingModel: string;
  openaiEmbeddingDim: number;
  ollamaEndpoint: string;
  ollamaModel: string;
  ollamaEmbeddingModel: string;
  ollamaEmbeddingDim: number;
  createdAt?: string;
  updatedAt?: string;
}

export const LLM_CONFIG_SINGLETON_ID = 1;

export const LLM_CONFIG_DEFAULTS: Omit<LLMConfig, 'id'> = {
  provider: 'openai',
  chatProvider: 'openai',
  embeddingProvider: 'openai',
  openaiApiKeyEncrypted: null,
  openaiModel: 'gpt-4.1-mini-2025-04-14',
  openaiEmbeddingModel: 'text-embedding-3-large',
  openaiEmbeddingDim: 3072,
  ollamaEndpoint: 'http://host.docker.internal:11434',
  ollamaModel: 'llama3',
  ollamaEmbeddingModel: 'nomic-embed-text',
  ollamaEmbeddingDim: 768,
};

export interface ILLMConfigRepository extends IBasicRepository<LLMConfig> {
  findSingleton(): Promise<LLMConfig>;
  updateSingleton(patch: Partial<LLMConfig>): Promise<LLMConfig>;
}

export class LLMConfigRepository
  extends BaseRepository<LLMConfig>
  implements ILLMConfigRepository
{
  constructor(knexPg: Knex) {
    super({ knexPg, tableName: 'llm_config' });
  }

  public async findSingleton(): Promise<LLMConfig> {
    const existing = await this.findOneBy({ id: LLM_CONFIG_SINGLETON_ID });
    if (existing) return existing;
    return await this.createOne({
      id: LLM_CONFIG_SINGLETON_ID,
      ...LLM_CONFIG_DEFAULTS,
    });
  }

  public async updateSingleton(patch: Partial<LLMConfig>): Promise<LLMConfig> {
    await this.findSingleton(); // ensure row exists
    return await this.updateOne(LLM_CONFIG_SINGLETON_ID, patch);
  }
}
