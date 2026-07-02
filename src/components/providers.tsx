'use client';

// ════════════════════════════════════════════════════════════════
// src/components/providers.tsx — 客户端 Provider 聚合
// ════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';
import { I18nProvider } from '@/lib/i18n/index';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      {children}
    </I18nProvider>
  );
}
