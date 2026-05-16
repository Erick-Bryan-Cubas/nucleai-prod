import { AppProps } from 'next/app';
import Head from 'next/head';
import { ConfigProvider, Spin } from 'antd';
import posthog from 'posthog-js';
import apolloClient from '@/apollo/client';
import { useGetSettingsQuery } from '@/apollo/client/graphql/settings.generated';
import { GlobalConfigProvider } from '@/hooks/useGlobalConfig';
import { PostHogProvider } from 'posthog-js/react';
import { ApolloProvider } from '@apollo/client';
import { defaultIndicator } from '@/components/PageLoading';
import ptBR from 'antd/lib/locale/pt_BR';
import enUS from 'antd/lib/locale/en_US';
import { useRouter } from 'next/router';
import { normalizeLocale } from '@/i18n/messages';

require('../styles/index.less');

Spin.setDefaultIndicator(defaultIndicator);

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { data: settingsResult } = useGetSettingsQuery();
  const projectLanguage = settingsResult?.settings?.language;
  const resolvedLocale = normalizeLocale(projectLanguage || router.locale);
  const antdLocale = resolvedLocale === 'pt-BR' ? ptBR : enUS;

  return (
    <ConfigProvider locale={antdLocale}>
      <GlobalConfigProvider>
        <PostHogProvider client={posthog}>
          <main className="app">
            <Component {...pageProps} />
          </main>
        </PostHogProvider>
      </GlobalConfigProvider>
    </ConfigProvider>
  );
}

function App(props: AppProps) {
  return (
    <>
      <Head>
        <title>NucleAI</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          rel="icon"
          type="image/x-icon"
          href="/favicon.ico"
          sizes="32x32 16x16"
        />
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </Head>
      <ApolloProvider client={apolloClient}>
        <AppContent {...props} />
      </ApolloProvider>
    </>
  );
}

export default App;
