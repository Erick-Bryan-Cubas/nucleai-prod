import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import errorHandler from '@/utils/errorHandler';

const apolloErrorLink = onError((error) => errorHandler(error));

// Tolerate brief network blips (container restart, mobile flaky link) by
// retrying with exponential backoff before surfacing as a network error.
// 4xx responses are NOT retried (they're input bugs, not transient failures).
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 2000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error) => {
      const statusCode = (error as any)?.statusCode;
      if (statusCode && statusCode >= 400 && statusCode < 500) return false;
      return Boolean(error);
    },
  },
});

const httpLink = new HttpLink({
  uri: '/api/graphql',
});

const client = new ApolloClient({
  link: from([apolloErrorLink, retryLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    // Most queries that pass nothing get the cached value first and only revalidate
    // in the background. Pages that need fresh data already opt-in to
    // 'cache-and-network' explicitly, so this just speeds up the rest.
    watchQuery: {
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
    },
  },
});

export default client;
