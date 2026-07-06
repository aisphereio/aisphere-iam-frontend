'use client';

import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

export function TitleUpdater() {
  const { locale, t } = useI18n();

  useEffect(() => {
    document.title = `${t('app.name')} - ${t('app.subtitle')}`;
  }, [locale, t]);

  return null;
}