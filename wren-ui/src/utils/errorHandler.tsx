import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { ErrorResponse } from '@apollo/client/link/error';
import { ApolloError } from '@apollo/client';
import { message } from 'antd';

// Refer to backend GeneralErrorCodes for mapping
export const ERROR_CODES = {
  INVALID_CALCULATED_FIELD: 'INVALID_CALCULATED_FIELD',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  NO_CHART: 'NO_CHART',
};

/**
 * Replace the token %{s} in the message with the detail message.
 * For example:
 *
 *  Input: ('Failed to update %{data source}.')
 *  Output: Failed to update data source.
 *
 *  Input: ('Failed to update %{data source}.', 'The data source is not found.')
 *  Output: Failed to update - The data source is not found.
 *
 * @param message The default message with replace token %{s}.
 * @param detailMessage The detail message.
 * @returns string
 */
const replaceMessage = (message: string, detailMessage?: string) => {
  const regex = /\%\{.+\}/;
  const textWithoutTokenRegex = /(?<=\%\{).+(?=\})/;
  const matchText = message.match(textWithoutTokenRegex);
  if (matchText === null) {
    console.warn('Replace token not found in message:', message);
    return message;
  }
  return detailMessage
    ? message.replace(regex, `- ${detailMessage}`)
    : message.replace(regex, matchText[0]);
};

abstract class ErrorHandler {
  public handle(error: ClientGraphQLError) {
    const errorMessage = this.getErrorMessage(error);
    if (errorMessage) message.error(errorMessage);
  }

  abstract getErrorMessage(error: ClientGraphQLError): string | null;
}

type ClientGraphQLError = {
  message: string;
  extensions?: GraphQLError['extensions'];
} & Partial<GraphQLFormattedError>;

const errorHandlers = new Map<string, ErrorHandler>();

class SaveTablesErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao criar o(s) modelo(s).';
    }
  }
}

class SaveRelationsErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao definir os relacionamentos.';
    }
  }
}

class CreateAskingTaskErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao criar a tarefa de pergunta.';
    }
  }
}

class CreateThreadErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao criar o chat.';
    }
  }
}

class UpdateThreadErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao atualizar o chat.';
    }
  }
}

class DeleteThreadErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao excluir o chat.';
    }
  }
}

class CreateThreadResponseErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao criar a resposta do chat.';
    }
  }
}

class UpdateThreadResponseErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao atualizar a resposta do chat.';
    }
  }
}

class GenerateThreadResponseAnswerErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao gerar a resposta do chat.';
    }
  }
}

class AdjustThreadResponseErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao ajustar a resposta do chat.';
    }
  }
}

class CreateViewErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao criar a view.';
    }
  }
}

class UpdateDataSourceErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return replaceMessage(
          `Falha ao atualizar a %{fonte de dados}.`,
          error.message,
        );
    }
  }
}

class CreateModelErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao criar o modelo.';
    }
  }
}

class UpdateModelErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao atualizar o modelo.';
    }
  }
}

class DeleteModelErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao excluir o modelo.';
    }
  }
}

class UpdateModelMetadataErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao atualizar metadados do modelo.';
    }
  }
}

class CreateCalculatedFieldErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao criar campo calculado.';
    }
  }
}

class UpdateCalculatedFieldErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao atualizar campo calculado.';
    }
  }
}

class DeleteCalculatedFieldErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao excluir campo calculado.';
    }
  }
}

class CreateRelationshipErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao criar o relacionamento.';
    }
  }
}

class UpdateRelationshipErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao atualizar o relacionamento.';
    }
  }
}

class DeleteRelationshipErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao excluir o relacionamento.';
    }
  }
}

class UpdateViewMetadataErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao atualizar metadados da view.';
    }
  }
}

class TriggerDataSourceDetectionErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao escanear a fonte de dados.';
    }
  }
}

class ResolveSchemaChangeErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao resolver mudança de schema.';
    }
  }
}

class CreateDashboardItemErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao criar item do dashboard.';
    }
  }
}

class UpdateDashboardItemErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao atualizar item do dashboard.';
    }
  }
}

class UpdateDashboardItemLayoutsErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao atualizar layout do dashboard.';
    }
  }
}

class DeleteDashboardItemErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao excluir item do dashboard.';
    }
  }
}

class SetDashboardScheduleErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao agendar atualização do dashboard.';
    }
  }
}

class CreateSqlPairErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao criar par Pergunta-SQL.';
    }
  }
}

class UpdateSqlPairErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao atualizar par Pergunta-SQL.';
    }
  }
}

class DeleteSqlPairErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao excluir par Pergunta-SQL.';
    }
  }
}

class CreateInstructionErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao criar instrução.';
    }
  }
}

class UpdateInstructionErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao atualizar instrução.';
    }
  }
}

class DeleteInstructionErrorHandler extends ErrorHandler {
  public getErrorMessage(error: GraphQLError) {
    switch (error.extensions?.code) {
      default:
        return 'Falha ao excluir instrução.';
    }
  }
}

errorHandlers.set('SaveTables', new SaveTablesErrorHandler());
errorHandlers.set('SaveRelations', new SaveRelationsErrorHandler());
errorHandlers.set('CreateAskingTask', new CreateAskingTaskErrorHandler());
errorHandlers.set('CreateThread', new CreateThreadErrorHandler());
errorHandlers.set('UpdateThread', new UpdateThreadErrorHandler());
errorHandlers.set('DeleteThread', new DeleteThreadErrorHandler());
errorHandlers.set(
  'CreateThreadResponse',
  new CreateThreadResponseErrorHandler(),
);
errorHandlers.set(
  'UpdateThreadResponse',
  new UpdateThreadResponseErrorHandler(),
);
errorHandlers.set(
  'GenerateThreadResponseAnswer',
  new GenerateThreadResponseAnswerErrorHandler(),
);
errorHandlers.set(
  'AdjustThreadResponse',
  new AdjustThreadResponseErrorHandler(),
);

errorHandlers.set('CreateView', new CreateViewErrorHandler());
errorHandlers.set('UpdateDataSource', new UpdateDataSourceErrorHandler());
errorHandlers.set('CreateModel', new CreateModelErrorHandler());
errorHandlers.set('UpdateModel', new UpdateModelErrorHandler());
errorHandlers.set('DeleteModel', new DeleteModelErrorHandler());
errorHandlers.set('UpdateModelMetadata', new UpdateModelMetadataErrorHandler());
errorHandlers.set('UpdateViewMetadata', new UpdateViewMetadataErrorHandler());
errorHandlers.set(
  'CreateCalculatedField',
  new CreateCalculatedFieldErrorHandler(),
);
errorHandlers.set(
  'UpdateCalculatedField',
  new UpdateCalculatedFieldErrorHandler(),
);
errorHandlers.set(
  'DeleteCalculatedField',
  new DeleteCalculatedFieldErrorHandler(),
);

// Relationship
errorHandlers.set('CreateRelationship', new CreateRelationshipErrorHandler());
errorHandlers.set('UpdateRelationship', new UpdateRelationshipErrorHandler());
errorHandlers.set('DeleteRelationship', new DeleteRelationshipErrorHandler());

// Schema change
errorHandlers.set(
  'TriggerDataSourceDetection',
  new TriggerDataSourceDetectionErrorHandler(),
);
errorHandlers.set('ResolveSchemaChange', new ResolveSchemaChangeErrorHandler());

// Dashboard
errorHandlers.set('CreateDashboardItem', new CreateDashboardItemErrorHandler());
errorHandlers.set('UpdateDashboardItem', new UpdateDashboardItemErrorHandler());
errorHandlers.set(
  'UpdateDashboardItemLayouts',
  new UpdateDashboardItemLayoutsErrorHandler(),
);
errorHandlers.set('DeleteDashboardItem', new DeleteDashboardItemErrorHandler());
errorHandlers.set(
  'SetDashboardSchedule',
  new SetDashboardScheduleErrorHandler(),
);

// SQL Pair
errorHandlers.set('CreateSqlPair', new CreateSqlPairErrorHandler());
errorHandlers.set('UpdateSqlPair', new UpdateSqlPairErrorHandler());
errorHandlers.set('DeleteSqlPair', new DeleteSqlPairErrorHandler());

// Instruction
errorHandlers.set('CreateInstruction', new CreateInstructionErrorHandler());
errorHandlers.set('UpdateInstruction', new UpdateInstructionErrorHandler());
errorHandlers.set('DeleteInstruction', new DeleteInstructionErrorHandler());

// Network errors during a brief container restart or background polling tick
// shouldn't carpet-bomb the UI with toasts. Require a few consecutive failures
// within a short window before showing it, and dedupe so polling at 1Hz
// produces at most one visible toast.
const NETWORK_ERROR_THRESHOLD = 4;
const NETWORK_ERROR_WINDOW_MS = 6000;
const NETWORK_TOAST_COOLDOWN_MS = 8000;
const NETWORK_TOAST_KEY = 'global-network-error';

let networkErrorTimestamps: number[] = [];
let lastNetworkToastAt = 0;

const reportNetworkError = () => {
  const now = Date.now();
  networkErrorTimestamps = networkErrorTimestamps.filter(
    (t) => now - t < NETWORK_ERROR_WINDOW_MS,
  );
  networkErrorTimestamps.push(now);

  if (networkErrorTimestamps.length < NETWORK_ERROR_THRESHOLD) return;
  if (now - lastNetworkToastAt < NETWORK_TOAST_COOLDOWN_MS) return;

  lastNetworkToastAt = now;
  message.error({
    key: NETWORK_TOAST_KEY,
    content:
      'Sem conexão com o servidor. Verifique sua rede e tente novamente.',
  });
};

const errorHandler = (error: ErrorResponse) => {
  if (error.networkError) {
    const statusCode = (error.networkError as any)?.statusCode;
    // Diagnostic log so we can see exactly which polled operation is firing
    // a network-level failure (HTTP 4xx/5xx → Apollo networkError).
    // eslint-disable-next-line no-console
    console.warn(
      '[apollo networkError]',
      error.operation?.operationName,
      error.operation?.variables,
      statusCode,
      (error.networkError as any)?.result || (error.networkError as any)?.bodyText,
    );
    // Only real network failures (no statusCode = fetch failure, or 5xx) count
    // toward the "sem conexão" toast. 4xx means the server is reachable and
    // rejected the input — those are bugs to fix, not connectivity issues.
    const isRealNetworkFailure =
      !statusCode || (statusCode >= 500 && statusCode < 600);
    if (isRealNetworkFailure) reportNetworkError();
  }

  const operationName = error?.operation?.operationName || '';
  if (error.graphQLErrors) {
    for (const err of error.graphQLErrors) {
      errorHandlers.get(operationName)?.handle(err);
    }
  }
};

export default errorHandler;

export const parseGraphQLError = (error: ApolloError) => {
  if (!error) return null;
  const graphQLErrors: ClientGraphQLError | undefined = error.graphQLErrors?.[0];
  const extensions = graphQLErrors?.extensions || {};
  return {
    message: extensions.message as string,
    shortMessage: extensions.shortMessage as string,
    code: extensions.code as string,
    stacktrace: extensions?.stacktrace as Array<string> | undefined,
  };
};
