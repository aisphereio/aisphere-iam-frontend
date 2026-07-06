import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtTime(v: string | number | Date | undefined | null): string {
  if (!v) return '-';
  return new Date(v).toLocaleString();
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function fmtRelativeTime(
  v: string | number | Date | undefined | null,
  t?: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!v) return '-';
  const diff = Date.now() - new Date(v).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return t ? t('common.justNow') : 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t ? t('common.minutesAgo', { minutes }) : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t ? t('common.hoursAgo', { hours }) : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return t ? t('common.daysAgo', { days }) : `${days}d ago`;
}

export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'enabled':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'inactive':
    case 'disabled':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'archived':
    case 'deleted':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    case 'pending':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    default:
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
  }
}