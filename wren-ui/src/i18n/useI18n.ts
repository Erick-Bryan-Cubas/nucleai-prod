import { useGetSettingsQuery } from '@/apollo/client/graphql/settings.generated';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { t as translate } from './messages';

export const useI18n = () => {
  const router = useRouter();
  const { data: settingsResult } = useGetSettingsQuery();
  const projectLanguage = settingsResult?.settings?.language;
  const locale = projectLanguage || router.locale;

  return useMemo(() => {
    return {
      locale,
      t: (key: string, variables?: Record<string, string | number>) =>
        translate(locale, key, variables),
    };
  }, [locale]);
};
