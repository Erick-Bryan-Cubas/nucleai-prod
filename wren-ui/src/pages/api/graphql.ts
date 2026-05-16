import microCors from 'micro-cors';
import { NextApiRequest, NextApiResponse, PageConfig } from 'next';
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { typeDefs } from '@server';
import resolvers from '@server/resolvers';
import { IContext } from '@server/types';
import { GraphQLError } from 'graphql';
import { getLogger } from '@server/utils';
import { getConfig } from '@server/config';
import { ModelService } from '@server/services/modelService';
import {
  defaultApolloErrorHandler,
  GeneralErrorCodes,
} from '@/apollo/server/utils/error';
import { TelemetryEvent } from '@/apollo/server/telemetry/telemetry';
import { components } from '@/common';

const serverConfig = getConfig();
const logger = getLogger('APOLLO');
logger.level = 'debug';

const cors = microCors();

export const config: PageConfig = {
  api: {},
};

const bootstrapServer = async () => {
  const {
    telemetry,
    askingService,
    projectRecommendQuestionBackgroundTracker,
    threadRecommendQuestionBackgroundTracker,
  } = components;

  // initialize services
  await Promise.all([
    askingService.initialize(),
    projectRecommendQuestionBackgroundTracker.initialize(),
    threadRecommendQuestionBackgroundTracker.initialize(),
  ]);

  const apolloServer = new ApolloServer<IContext>({
    typeDefs,
    resolvers,
    formatError: (_formattedError, error: GraphQLError) => {
      // stop print error stacktrace of dry run error
      if (error.extensions?.code === GeneralErrorCodes.DRY_RUN_ERROR) {
        return defaultApolloErrorHandler(error);
      }

      // print error stacktrace of graphql error
      const stacktrace = error.extensions?.stacktrace;
      if (Array.isArray(stacktrace)) {
        logger.error(stacktrace.join('\n'));
      }

      // print original error stacktrace
      const originalError = error.extensions?.originalError as Error;
      if (originalError) {
        logger.error(`== original error ==`);
        // error may not have stack, so print error message if stack is not available
        logger.error(originalError.stack || originalError.message);
      }

      // telemetry: capture internal server error
      if (error.extensions?.code === GeneralErrorCodes.INTERNAL_SERVER_ERROR) {
        telemetry.sendEvent(
          TelemetryEvent.GRAPHQL_ERROR,
          {
            originalErrorStack: originalError?.stack,
            originalErrorMessage: originalError?.message,
            errorMessage: error.message,
          },
          error.extensions?.service,
          false,
        );
      }
      return defaultApolloErrorHandler(error);
    },
    introspection: process.env.NODE_ENV !== 'production',
  });
  return apolloServer;
};

const startServer = bootstrapServer();
const nextHandler = startServer.then((apolloServer) =>
  startServerAndCreateNextHandler<NextApiRequest>(
    apolloServer as unknown as ApolloServer<object>,
    {
      context: async (_req, _res): Promise<IContext> => {
        const {
          telemetry,
          projectRepository,
          modelRepository,
          modelColumnRepository,
          relationRepository,
          deployLogRepository,
          viewRepository,
          schemaChangeRepository,
          learningRepository,
          modelNestedColumnRepository,
          dashboardRepository,
          dashboardItemRepository,
          sqlPairRepository,
          instructionRepository,
          apiHistoryRepository,
          dashboardItemRefreshJobRepository,
          wrenEngineAdaptor,
          ibisAdaptor,
          wrenAIAdaptor,
          projectService,
          queryService,
          askingService,
          deployService,
          mdlService,
          dashboardService,
          sqlPairService,
          instructionService,
          llmConfigService,
          llmConfigRepository,
          projectRecommendQuestionBackgroundTracker,
          threadRecommendQuestionBackgroundTracker,
          dashboardCacheBackgroundTracker,
        } = components;

        const modelService = new ModelService({
          projectService,
          modelRepository,
          modelColumnRepository,
          relationRepository,
          viewRepository,
          mdlService,
          wrenEngineAdaptor,
          queryService,
        });

        return {
          config: serverConfig,
          telemetry,
          wrenEngineAdaptor,
          ibisServerAdaptor: ibisAdaptor,
          wrenAIAdaptor,
          projectService,
          modelService,
          mdlService,
          deployService,
          askingService,
          queryService,
          dashboardService,
          sqlPairService,
          instructionService,
          llmConfigService,
          projectRepository,
          modelRepository,
          modelColumnRepository,
          modelNestedColumnRepository,
          relationRepository,
          viewRepository,
          deployRepository: deployLogRepository,
          schemaChangeRepository,
          learningRepository,
          dashboardRepository,
          dashboardItemRepository,
          sqlPairRepository,
          instructionRepository,
          apiHistoryRepository,
          dashboardItemRefreshJobRepository,
          llmConfigRepository,
          projectRecommendQuestionBackgroundTracker,
          threadRecommendQuestionBackgroundTracker,
          dashboardCacheBackgroundTracker,
        };
      },
    },
  ),
);

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const apolloHandler = await nextHandler;
  await apolloHandler(req, res);
};

export default cors((req: NextApiRequest, res: NextApiResponse) =>
  req.method === 'OPTIONS' ? res.status(200).end() : handler(req, res),
);
