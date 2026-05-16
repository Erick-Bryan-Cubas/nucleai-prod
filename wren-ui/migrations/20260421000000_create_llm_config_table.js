/**
 * NucleAI: singleton table holding the user-configured LLM provider.
 * The row with id=1 is the active configuration; the UI rewrites it and
 * then regenerates /app/shared/config.yaml + .env.runtime for wren-ai-service.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('llm_config', (table) => {
    table.increments('id').primary();
    table.string('provider').notNullable().defaultTo('openai'); // 'openai' | 'ollama'

    // OpenAI
    table.text('openai_api_key_encrypted').nullable();
    table.string('openai_model').defaultTo('gpt-4.1-mini-2025-04-14');
    table.string('openai_embedding_model').defaultTo('text-embedding-3-large');
    table.integer('openai_embedding_dim').defaultTo(3072);

    // Ollama
    table
      .string('ollama_endpoint')
      .defaultTo('http://host.docker.internal:11434');
    table.string('ollama_model').defaultTo('llama3');
    table.string('ollama_embedding_model').defaultTo('nomic-embed-text');
    table.integer('ollama_embedding_dim').defaultTo(768);

    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('llm_config');
};
