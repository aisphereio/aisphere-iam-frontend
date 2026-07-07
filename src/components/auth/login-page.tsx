'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { LanguageToggle } from '@/components/layout/language-toggle';

/**
 * Login page.
 *
 * In Gateway-only OIDC mode, the Envoy Gateway handles authentication.
 * Clicking "Login" redirects to the Gateway's OIDC authorization endpoint,
 * which redirects to Casdoor. After successful login, the Gateway redirects
 * back to the app with the user already authenticated.
 */
export function LoginPage() {
  const t = useT();

  const loginWithGateway = () => {
    // Redirect to the app's root — the Gateway OIDC SecurityPolicy will
    // intercept the unauthenticated request and redirect to Casdoor.
    window.location.href = '/';
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
            onClick={loginWithGateway}
            className="w-full h-11 text-sm font-medium bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white shadow-lg shadow-violet-500/20 transition-all duration-200"
          >
            <span className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              {t('login.casdoor')}
            </span>
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