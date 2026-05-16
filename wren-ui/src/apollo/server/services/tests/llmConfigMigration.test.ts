import knexFactory, { Knex } from 'knex';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const createMigration = require('../../../../../migrations/20260421000000_create_llm_config_table.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const alterMigration = require('../../../../../migrations/20260421100000_add_chat_and_embedding_providers_to_llm_config.js');

describe('llm_config provider migration', () => {
  let knex: Knex;

  beforeEach(async () => {
    knex = knexFactory({
      client: 'better-sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });
    await createMigration.up(knex);
  });

  afterEach(async () => {
    await knex.destroy();
  });

  it('backfills chat_provider and embedding_provider from legacy provider', async () => {
    await knex('llm_config').insert([
      {
        id: 1,
        provider: 'openai',
        openai_api_key_encrypted: null,
        openai_model: 'gpt-4.1-mini-2025-04-14',
        openai_embedding_model: 'text-embedding-3-large',
        openai_embedding_dim: 3072,
        ollama_endpoint: 'http://host.docker.internal:11434',
        ollama_model: 'llama3',
        ollama_embedding_model: 'nomic-embed-text',
        ollama_embedding_dim: 768,
      },
      {
        id: 2,
        provider: 'ollama',
        openai_api_key_encrypted: null,
        openai_model: 'gpt-4.1-mini-2025-04-14',
        openai_embedding_model: 'text-embedding-3-large',
        openai_embedding_dim: 3072,
        ollama_endpoint: 'http://host.docker.internal:11434',
        ollama_model: 'llama3',
        ollama_embedding_model: 'nomic-embed-text',
        ollama_embedding_dim: 768,
      },
    ]);

    await alterMigration.up(knex);

    const rows = await knex('llm_config')
      .select('id', 'chat_provider', 'embedding_provider')
      .orderBy('id');

    expect(rows).toEqual([
      {
        id: 1,
        chat_provider: 'openai',
        embedding_provider: 'openai',
      },
      {
        id: 2,
        chat_provider: 'ollama',
        embedding_provider: 'ollama',
      },
    ]);
  });
});
