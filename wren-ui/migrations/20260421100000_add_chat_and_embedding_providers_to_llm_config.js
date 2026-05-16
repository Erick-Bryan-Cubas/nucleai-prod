/**
 * Add independent chat and embedding providers to llm_config.
 * Existing rows are backfilled from the legacy `provider` column.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasChatProvider = await knex.schema.hasColumn(
    'llm_config',
    'chat_provider',
  );
  const hasEmbeddingProvider = await knex.schema.hasColumn(
    'llm_config',
    'embedding_provider',
  );

  if (!hasChatProvider || !hasEmbeddingProvider) {
    await knex.schema.alterTable('llm_config', (table) => {
      if (!hasChatProvider) {
        table.string('chat_provider').notNullable().defaultTo('openai');
      }
      if (!hasEmbeddingProvider) {
        table.string('embedding_provider').notNullable().defaultTo('openai');
      }
    });
  }

  const rows = await knex('llm_config').select(
    'id',
    'provider',
    'chat_provider',
    'embedding_provider',
  );

  for (const row of rows) {
    const provider = row.provider || 'openai';
    const patch = {
      chat_provider: provider,
      embedding_provider: provider,
    };

    if (
      row.chat_provider !== patch.chat_provider ||
      row.embedding_provider !== patch.embedding_provider
    ) {
      await knex('llm_config').where({ id: row.id }).update(patch);
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasChatProvider = await knex.schema.hasColumn(
    'llm_config',
    'chat_provider',
  );
  const hasEmbeddingProvider = await knex.schema.hasColumn(
    'llm_config',
    'embedding_provider',
  );

  if (hasChatProvider || hasEmbeddingProvider) {
    await knex.schema.alterTable('llm_config', (table) => {
      if (hasChatProvider) {
        table.dropColumn('chat_provider');
      }
      if (hasEmbeddingProvider) {
        table.dropColumn('embedding_provider');
      }
    });
  }
};
