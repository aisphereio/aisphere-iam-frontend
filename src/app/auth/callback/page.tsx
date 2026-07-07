'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function AuthCallbackPage() {
  const t = useT();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/';
    const safeNext = next.startsWith('/') ? next : '/';
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.replace(safeNext);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{t('login.completing')}</span>
      </div>
    </div>
  );
}
