'use client';

import { Label } from '@/components/ui/label';

/**
 * Labeled field wrapper shared by the access-control form views.
 * Keeps the label + control spacing consistent across access-assignments,
 * permission-diagnosis and advanced-governance.
 */
export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
