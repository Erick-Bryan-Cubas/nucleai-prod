import { LLMConfig } from '@server/repositories/llmConfigRepository';

// Pure function: deterministic, no I/O, fully unit-testable.
// Keeps the non-LLM sections identical to docker/config.example.yaml so we
// don't accidentally drop a pipeline and crash wren-ai-service on reload.

export function renderConfigYaml(c: LLMConfig): string {
  const llmBlock =
    resolveChatProvider(c) === 'ollama' ? ollamaLlmBlock(c) : openaiLlmBlock(c);
  const embBlock =
    resolveEmbeddingProvider(c) === 'ollama'
      ? ollamaEmbedderBlock(c)
      : openaiEmbedderBlock(c);
  const dim =
    resolveEmbeddingProvider(c) === 'ollama'
      ? c.ollamaEmbeddingDim
      : c.openaiEmbeddingDim;

  return [
    llmBlock,
    embBlock,
    ENGINES_BLOCK,
    documentStoreBlock(dim),
    PIPELINES_BLOCK,
    SETTINGS_BLOCK,
  ].join('\n---\n');
}

function resolveChatProvider(c: LLMConfig): string {
  return c.chatProvider || c.provider || 'openai';
}

function resolveEmbeddingProvider(c: LLMConfig): string {
  return c.embeddingProvider || c.provider || 'openai';
}

function openaiLlmBlock(c: LLMConfig): string {
  // The first entry has alias: default which is the one pipelines reference
  // via litellm_llm.default. Additional entries are optional; we keep only
  // the user-selected model to avoid config drift.
  return `type: llm
provider: litellm_llm
timeout: 120
models:
  - alias: default
    model: ${c.openaiModel}
    context_window_size: 1000000
    kwargs:
      max_tokens: 4096
      n: 1
      seed: 0
      temperature: 0
`;
}

function ollamaLlmBlock(c: LLMConfig): string {
  // LiteLLM routes `ollama/<model>` to the Ollama provider when api_base is
  // set. host.docker.internal lets the container reach an Ollama daemon on
  // the host; override the endpoint in LLMSettings if Ollama runs elsewhere.
  return `type: llm
provider: litellm_llm
timeout: 120
models:
  - alias: default
    model: ollama/${c.ollamaModel}
    api_base: ${c.ollamaEndpoint}
    context_window_size: 8192
    kwargs:
      max_tokens: 4096
      n: 1
      seed: 0
      temperature: 0
`;
}

function openaiEmbedderBlock(c: LLMConfig): string {
  return `type: embedder
provider: litellm_embedder
models:
  - model: ${c.openaiEmbeddingModel}
    alias: default
    timeout: 120
`;
}

function ollamaEmbedderBlock(c: LLMConfig): string {
  return `type: embedder
provider: litellm_embedder
models:
  - model: ollama/${c.ollamaEmbeddingModel}
    api_base: ${c.ollamaEndpoint}
    alias: default
    timeout: 120
`;
}

function documentStoreBlock(embeddingDim: number): string {
  return `type: document_store
provider: qdrant
location: http://qdrant:6333
embedding_model_dim: ${embeddingDim}
timeout: 120
recreate_index: true
`;
}

const ENGINES_BLOCK = `type: engine
provider: wren_ui
endpoint: http://wren-ui:3000

---
type: engine
provider: wren_ibis
endpoint: http://ibis-server:8000
`;

const PIPELINES_BLOCK = `type: pipeline
pipes:
  - name: db_schema_indexing
    embedder: litellm_embedder.default
    document_store: qdrant
  - name: historical_question_indexing
    embedder: litellm_embedder.default
    document_store: qdrant
  - name: table_description_indexing
    embedder: litellm_embedder.default
    document_store: qdrant
  - name: db_schema_retrieval
    llm: litellm_llm.default
    embedder: litellm_embedder.default
    document_store: qdrant
  - name: historical_question_retrieval
    embedder: litellm_embedder.default
    document_store: qdrant
  - name: sql_generation
    llm: litellm_llm.default
    engine: wren_ui
    document_store: qdrant
  - name: sql_correction
    llm: litellm_llm.default
    engine: wren_ui
    document_store: qdrant
  - name: followup_sql_generation
    llm: litellm_llm.default
    engine: wren_ui
    document_store: qdrant
  - name: sql_answer
    llm: litellm_llm.default
  - name: semantics_description
    llm: litellm_llm.default
  - name: relationship_recommendation
    llm: litellm_llm.default
  - name: question_recommendation
    llm: litellm_llm.default
  - name: question_recommendation_sql_generation
    llm: litellm_llm.default
    engine: wren_ui
    document_store: qdrant
  - name: intent_classification
    llm: litellm_llm.default
    embedder: litellm_embedder.default
    document_store: qdrant
  - name: misleading_assistance
    llm: litellm_llm.default
  - name: data_assistance
    llm: litellm_llm.default
  - name: sql_pairs_indexing
    document_store: qdrant
    embedder: litellm_embedder.default
  - name: sql_pairs_retrieval
    document_store: qdrant
    embedder: litellm_embedder.default
    llm: litellm_llm.default
  - name: preprocess_sql_data
    llm: litellm_llm.default
  - name: sql_executor
    engine: wren_ui
  - name: chart_generation
    llm: litellm_llm.default
  - name: chart_adjustment
    llm: litellm_llm.default
  - name: user_guide_assistance
    llm: litellm_llm.default
  - name: sql_question_generation
    llm: litellm_llm.default
  - name: sql_generation_reasoning
    llm: litellm_llm.default
  - name: followup_sql_generation_reasoning
    llm: litellm_llm.default
  - name: sql_regeneration
    llm: litellm_llm.default
    engine: wren_ui
  - name: instructions_indexing
    embedder: litellm_embedder.default
    document_store: qdrant
  - name: instructions_retrieval
    embedder: litellm_embedder.default
    document_store: qdrant
  - name: sql_functions_retrieval
    engine: wren_ibis
    document_store: qdrant
  - name: project_meta_indexing
    document_store: qdrant
  - name: sql_tables_extraction
    llm: litellm_llm.default
  - name: sql_diagnosis
    llm: litellm_llm.default
  - name: sql_knowledge_retrieval
    engine: wren_ui
    document_store: qdrant
`;

const SETTINGS_BLOCK = `settings:
  doc_endpoint: https://docs.getwren.ai
  is_oss: true
  engine_timeout: 30
  column_indexing_batch_size: 50
  table_retrieval_size: 10
  table_column_retrieval_size: 100
  allow_intent_classification: true
  allow_sql_generation_reasoning: true
  allow_sql_functions_retrieval: true
  enable_column_pruning: false
  max_sql_correction_retries: 3
  query_cache_maxsize: 1000
  query_cache_ttl: 3600
  langfuse_host: https://cloud.langfuse.com
  langfuse_enable: true
  logging_level: DEBUG
  development: false
  historical_question_retrieval_similarity_threshold: 0.9
  sql_pairs_similarity_threshold: 0.7
  sql_pairs_retrieval_max_size: 10
  instructions_similarity_threshold: 0.7
  instructions_top_k: 10
`;
