import * as Types from './__types__';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;

export type LLMConfigFieldsFragment = {
  __typename?: 'LLMConfig';
  chatProvider: string;
  embeddingProvider: string;
  hasOpenaiApiKey: boolean;
  openaiModel: string;
  openaiEmbeddingModel: string;
  openaiEmbeddingDim: number;
  ollamaEndpoint: string;
  ollamaModel: string;
  ollamaEmbeddingModel: string;
  ollamaEmbeddingDim: number;
  updatedAt?: string | null;
};

export type LlmConfigQueryVariables = Types.Exact<{ [key: string]: never }>;

export type LlmConfigQuery = {
  __typename?: 'Query';
  llmConfig: LLMConfigFieldsFragment;
};

export type UpdateLlmConfigMutationVariables = Types.Exact<{
  data: {
    chatProvider?: string | null;
    embeddingProvider?: string | null;
    openaiApiKey?: string | null;
    openaiModel?: string | null;
    openaiEmbeddingModel?: string | null;
    openaiEmbeddingDim?: number | null;
    ollamaEndpoint?: string | null;
    ollamaModel?: string | null;
    ollamaEmbeddingModel?: string | null;
    ollamaEmbeddingDim?: number | null;
  };
}>;

export type UpdateLlmConfigMutation = {
  __typename?: 'Mutation';
  updateLLMConfig: {
    __typename?: 'UpdateLLMConfigResult';
    config: LLMConfigFieldsFragment;
    reload: {
      __typename?: 'ReloadStatus';
      ok: boolean;
      llmModel?: string | null;
      embeddingModel?: string | null;
      error?: string | null;
    };
  };
};

export type TestLlmConnectionMutationVariables = Types.Exact<{
  target: 'CHAT' | 'EMBEDDING';
  data: UpdateLlmConfigMutationVariables['data'];
}>;

export type TestLlmConnectionMutation = {
  __typename?: 'Mutation';
  testLLMConnection: {
    __typename?: 'TestLLMConnectionResult';
    ok: boolean;
    error?: string | null;
  };
};

export const LLMConfigFieldsFragmentDoc = gql`
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

export const LlmConfigDocument = gql`
  query LLMConfig {
    llmConfig {
      ...LLMConfigFields
    }
  }
  ${LLMConfigFieldsFragmentDoc}
`;

export function useLlmConfigQuery(
  baseOptions?: Apollo.QueryHookOptions<LlmConfigQuery, LlmConfigQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<LlmConfigQuery, LlmConfigQueryVariables>(
    LlmConfigDocument,
    options,
  );
}
export function useLlmConfigLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    LlmConfigQuery,
    LlmConfigQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<LlmConfigQuery, LlmConfigQueryVariables>(
    LlmConfigDocument,
    options,
  );
}
export type LlmConfigQueryHookResult = ReturnType<typeof useLlmConfigQuery>;
export type LlmConfigLazyQueryHookResult = ReturnType<
  typeof useLlmConfigLazyQuery
>;
export type LlmConfigQueryResult = Apollo.QueryResult<
  LlmConfigQuery,
  LlmConfigQueryVariables
>;

export const UpdateLlmConfigDocument = gql`
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
  ${LLMConfigFieldsFragmentDoc}
`;
export type UpdateLlmConfigMutationFn = Apollo.MutationFunction<
  UpdateLlmConfigMutation,
  UpdateLlmConfigMutationVariables
>;

export function useUpdateLlmConfigMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UpdateLlmConfigMutation,
    UpdateLlmConfigMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    UpdateLlmConfigMutation,
    UpdateLlmConfigMutationVariables
  >(UpdateLlmConfigDocument, options);
}
export type UpdateLlmConfigMutationHookResult = ReturnType<
  typeof useUpdateLlmConfigMutation
>;
export type UpdateLlmConfigMutationResult =
  Apollo.MutationResult<UpdateLlmConfigMutation>;
export type UpdateLlmConfigMutationOptions = Apollo.BaseMutationOptions<
  UpdateLlmConfigMutation,
  UpdateLlmConfigMutationVariables
>;

export const TestLlmConnectionDocument = gql`
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
export type TestLlmConnectionMutationFn = Apollo.MutationFunction<
  TestLlmConnectionMutation,
  TestLlmConnectionMutationVariables
>;

export function useTestLlmConnectionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    TestLlmConnectionMutation,
    TestLlmConnectionMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    TestLlmConnectionMutation,
    TestLlmConnectionMutationVariables
  >(TestLlmConnectionDocument, options);
}
export type TestLlmConnectionMutationHookResult = ReturnType<
  typeof useTestLlmConnectionMutation
>;
export type TestLlmConnectionMutationResult =
  Apollo.MutationResult<TestLlmConnectionMutation>;
export type TestLlmConnectionMutationOptions = Apollo.BaseMutationOptions<
  TestLlmConnectionMutation,
  TestLlmConnectionMutationVariables
>;

export type OllamaModelInfo = {
  __typename?: 'OllamaModelInfo';
  name: string;
  size?: number | null;
  family?: string | null;
  parameterSize?: string | null;
};

export type ListOllamaModelsQueryVariables = Types.Exact<{
  endpoint?: string | null;
}>;

export type ListOllamaModelsQuery = {
  __typename?: 'Query';
  listOllamaModels: {
    __typename?: 'ListOllamaModelsResult';
    ok: boolean;
    error?: string | null;
    models: OllamaModelInfo[];
  };
};

export const ListOllamaModelsDocument = gql`
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

export function useListOllamaModelsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    ListOllamaModelsQuery,
    ListOllamaModelsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<ListOllamaModelsQuery, ListOllamaModelsQueryVariables>(
    ListOllamaModelsDocument,
    options,
  );
}
export function useListOllamaModelsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    ListOllamaModelsQuery,
    ListOllamaModelsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    ListOllamaModelsQuery,
    ListOllamaModelsQueryVariables
  >(ListOllamaModelsDocument, options);
}

export type ProbeOllamaEmbeddingDimMutationVariables = Types.Exact<{
  endpoint: string;
  model: string;
}>;

export type ProbeOllamaEmbeddingDimMutation = {
  __typename?: 'Mutation';
  probeOllamaEmbeddingDim: {
    __typename?: 'ProbeEmbeddingDimResult';
    ok: boolean;
    error?: string | null;
    dim?: number | null;
  };
};

export const ProbeOllamaEmbeddingDimDocument = gql`
  mutation ProbeOllamaEmbeddingDim($endpoint: String!, $model: String!) {
    probeOllamaEmbeddingDim(endpoint: $endpoint, model: $model) {
      ok
      error
      dim
    }
  }
`;

export function useProbeOllamaEmbeddingDimMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ProbeOllamaEmbeddingDimMutation,
    ProbeOllamaEmbeddingDimMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    ProbeOllamaEmbeddingDimMutation,
    ProbeOllamaEmbeddingDimMutationVariables
  >(ProbeOllamaEmbeddingDimDocument, options);
}
