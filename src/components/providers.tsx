'use client';

// ════════════════════════════════════════════════════════════════
// src/components/providers.tsx — 客户端 Provider 聚合
// ════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';
import { I18nProvider } from '@/lib/i18n/index';
import { GlobalTranslator } from '@/components/web5/i18n/global-translator';
import { TmaProvider } from '@/components/web5/telegram/tma-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TmaProvider>
      <I18nProvider>
        <GlobalTranslator />
        {children}
      </I18nProvider>
    </TmaProvider>
  );
}
