'use client';

// ════════════════════════════════════════════════════════════════
// src/components/providers.tsx — 客户端 Provider 聚合
// ════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
