import { gql } from '@apollo/client';

export const DEPLOY = gql`
  mutation Deploy($force: Boolean, $skipAiReindex: Boolean) {
    deploy(force: $force, skipAiReindex: $skipAiReindex)
  }
`;

export const GET_DEPLOY_STATUS = gql`
  query DeployStatus {
    modelSync {
      status
      lastDeployHash
    }
  }
`;
