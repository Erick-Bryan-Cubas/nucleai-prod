import { gql } from '@apollo/client';

export const LLM_CONFIG_FIELDS = gql`
  fragment LLMConfigFields on LLMConfig {
    chatProvider
    embeddingProvider
    hasOpenaiApiKey
    openaiModel
    openaiEmbeddingModel
    openaiEmbeddingDim
    ollamaEndpoint
    ollamaModel
    ollamaEmbeddingModel
    ollamaEmbeddingDim
    updatedAt
  }
`;

export const LLM_CONFIG = gql`
  query LLMConfig {
    llmConfig {
      ...LLMConfigFields
    }
  }
  ${LLM_CONFIG_FIELDS}
`;

export const UPDATE_LLM_CONFIG = gql`
  mutation UpdateLLMConfig($data: UpdateLLMConfigInput!) {
    updateLLMConfig(data: $data) {
      config {
        ...LLMConfigFields
      }
      reload {
        ok
        llmModel
        embeddingModel
        error
      }
    }
  }
  ${LLM_CONFIG_FIELDS}
`;

export const TEST_LLM_CONNECTION = gql`
  mutation TestLLMConnection(
    $target: LLMConnectionTarget!
    $data: UpdateLLMConfigInput!
  ) {
    testLLMConnection(target: $target, data: $data) {
      ok
      error
    }
  }
`;

export const LIST_OLLAMA_MODELS = gql`
  query ListOllamaModels($endpoint: String) {
    listOllamaModels(endpoint: $endpoint) {
      ok
      error
      models {
        name
        size
        family
        parameterSize
      }
    }
  }
`;

export const PROBE_OLLAMA_EMBEDDING_DIM = gql`
  mutation ProbeOllamaEmbeddingDim($endpoint: String!, $model: String!) {
    probeOllamaEmbeddingDim(endpoint: $endpoint, model: $model) {
      ok
      error
      dim
    }
  }
`;
