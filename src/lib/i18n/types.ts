// ════════════════════════════════════════════════════════════════
// src/lib/i18n/types.ts — catalog types and the typed t() signature
// ════════════════════════════════════════════════════════════════

import type { Dictionary } from './locales/zh-CN';

export type { Dictionary };

/** Nested `Partial` that keeps string leaves intact. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? T[K] : DeepPartial<T[K]>;
};

/**
 * Flattens the catalog into dotted key literals:
 * `nav.founder`, `home.hero.ctaRead`, …
 * A typo in `t('nav.foundr')` is a compile error.
 */
type JoinPath<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : JoinPath<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = JoinPath<Dictionary>;

export type TVars = Record<string, string | number>;

/** The translator handed to components. Only catalog keys are accepted. */
export type TFunction = (key: MessageKey, vars?: TVars) => string;
