/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const withLess = require('next-with-less');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const resolveAlias = {
  antd$: path.resolve(__dirname, 'src/import/antd'),
};

/** @type {import('next').NextConfig} */
const nextConfig = withLess({
  typescript: { ignoreBuildErrors: false },
  experimental: {
    optimizePackageImports: [],
  },
  output: 'standalone',
  staticPageGenerationTimeout: 1000,
  i18n: {
    locales: ['en', 'pt-BR'],
    defaultLocale: 'pt-BR',
    localeDetection: false,
  },
  compiler: {
    // Enables the styled-components SWC transform
    styledComponents: {
      displayName: true,
      ssr: true,
    },
  },
  lessLoaderOptions: {
    additionalData: `@import "@/styles/antd-variables.less";`,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...resolveAlias,
    };
    return config;
  },
  // routes redirect
  async redirects() {
    return [
      {
        source: '/setup',
        destination: '/setup/connection',
        permanent: true,
      },
    ];
  },
});

module.exports = withBundleAnalyzer(nextConfig);
