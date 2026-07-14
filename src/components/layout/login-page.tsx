'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { AlertCircle, LoaderCircle, Sparkles, LogIn, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useT } from '@/lib/i18n';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

interface LoginPageProps {
  state?: 'idle' | 'checking' | 'error';
  message?: string;
  onLogin?: () => void;
}

export function LoginPage({ state = 'idle', message, onLogin }: LoginPageProps) {
  const t = useT();
  const isChecking = state === 'checking';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* ─── Background decoration ──────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Large gradient orb top-left */}
        <div className="absolute -left-48 -top-48 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent blur-3xl dark:from-violet-500/15 dark:via-fuchsia-500/8" />
        {/* Large gradient orb bottom-right */}
        <div className="absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-violet-500/10 via-fuchsia-500/5 to-transparent blur-3xl dark:from-violet-500/15 dark:via-fuchsia-500/8" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 flex w-full max-w-[420px] flex-col items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Brand icon */}
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 dark:shadow-violet-500/20">
            <Sparkles className="h-7 w-7" />
          </div>
        </motion.div>

        {/* Login card */}
        <motion.div variants={itemVariants} className="w-full">
          <Card className="w-full border-border/60 px-5 py-8 sm:px-8 sm:py-10 shadow-lg shadow-violet-500/5 backdrop-blur-sm dark:shadow-violet-500/5">
            <div className="flex flex-col items-center text-center">
              {/* Title */}
              <h1 className="text-2xl font-bold tracking-tight gradient-text">
                {t('login.title')}
              </h1>

              {/* Subtitle */}
              <p className="mt-2 text-sm text-muted-foreground">
                {t('login.subtitle')}
              </p>

              {/* Divider */}
              <div className="my-6 flex w-full items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <Shield className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                <div className="h-px flex-1 bg-border" />
              </div>

              {state === 'error' && (
                <div className="mb-4 flex w-full items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{message || t('login.sessionError')}</span>
                </div>
              )}

              <Button
                size="lg"
                className="h-11 w-full gap-2 text-base font-medium"
                disabled={isChecking}
                onClick={() => {
                  if (onLogin) onLogin();
                }}
              >
                {isChecking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {isChecking ? t('login.completing') : t('login.casdoor')}
              </Button>

              {/* Note */}
              <p className="mt-3 text-xs text-muted-foreground/60">
                {isChecking ? t('login.completingNote') : t('login.note')}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          variants={itemVariants}
          className="mt-6 text-xs text-muted-foreground/40"
        >
          {t('login.footer')}
        </motion.p>
      </motion.div>
    </div>
  );
}
