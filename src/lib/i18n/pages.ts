// ════════════════════════════════════════════════════════════════
// src/lib/i18n/pages.ts — per-route metadata built from the catalog
//
// Both the default (`/founder`) and prefixed (`/en/founder`) wrappers call
// these so the two copies never drift.
// ════════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import type { LocaleCode } from './config';
import { createT } from './translate';
import { pageMetadata } from './metadata';

export function homeMetadata(locale: LocaleCode): Metadata {
  const t = createT(locale);
  return pageMetadata({
    locale,
    path: '/',
    ogTitle: t('layout.ogTitle'),
    ogDescription: t('layout.ogDescription'),
  });
}

export function founderMetadata(locale: LocaleCode): Metadata {
  const t = createT(locale);
  return pageMetadata({
    locale,
    path: '/founder',
    title: t('founder.title'),
    description: t('founder.manifesto1'),
    ogTitle: t('founder.title'),
    ogDescription: t('founder.manifesto1'),
  });
}
