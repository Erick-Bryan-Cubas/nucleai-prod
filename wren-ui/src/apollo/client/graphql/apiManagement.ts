import { gql } from '@apollo/client';

export const API_HISTORY = gql`
  query ApiHistory(
    $filter: ApiHistoryFilterInput
    $pagination: ApiHistoryPaginationInput!
  ) {
    apiHistory(filter: $filter, pagination: $pagination) {
      items {
        id
        projectId
        apiType
        threadId
        headers
        requestPayload
        responsePayload
        statusCode
        durationMs
        createdAt
        updatedAt
      }
      total
      hasMore
    }
  }
`;

export const DELETE_API_HISTORY = gql`
  mutation DeleteApiHistory($ids: [String!]!) {
    deleteApiHistory(ids: $ids)
  }
`;
