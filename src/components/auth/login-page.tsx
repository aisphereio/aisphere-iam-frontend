'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { iamAuthApi } from '@/lib/api';
import { LanguageToggle } from '@/components/layout/language-toggle';

export function LoginPage() {
  const t = useT();
  const [loading, setLoading] = useState(false);

  const loginWithCasdoor = async () => {
    setLoading(true);
    try {
      const callbackPath = process.env.NEXT_PUBLIC_AUTH_CALLBACK_PATH || '/auth/callback';
      const redirectUri = callbackPath.startsWith('http')
        ? callbackPath
        : `${window.location.origin}${callbackPath}`;
      const state = window.location.pathname + window.location.search;
      const loginUrl = await iamAuthApi.buildLoginUrl(redirectUri, state);
      if (loginUrl) {
        window.location.href = loginUrl;
      } else {
        throw new Error(t('login.noToken'));
      }
    } catch (err) {
      console.error('Login failed:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-violet-500/5 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-500/10 blur-[120px]" />

      {/* Language toggle */}
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm mx-auto px-4"
      >
        <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-8 shadow-xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">{t('login.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1.5">{t('login.subtitle')}</p>
          </div>

          <Button
            onClick={loginWithCasdoor}
            disabled={loading}
            className="w-full h-11 text-sm font-medium bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white shadow-lg shadow-violet-500/20 transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                {t('login.completing')}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                {t('login.casdoor')}
              </span>
            )}
          </Button>

          <p className="text-xs text-muted-foreground/60 text-center mt-4">{t('login.note')}</p>

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-[11px] text-muted-foreground/40">{t('login.footer')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

