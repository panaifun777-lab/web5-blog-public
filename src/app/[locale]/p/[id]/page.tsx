import type { Metadata } from 'next';
import ArticlePage, { articleMetadata } from '@/views/article';
import { coerceLocale } from '@/lib/i18n/routing';

// Mirrors `app/(default)/p/[id]`: the article view accepts a `locale` prop, the
// URL segment is the source of truth, and the `[locale]` layout 404s any value
// that is not a prefixed locale.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return articleMetadata(id);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  return <ArticlePage id={id} locale={coerceLocale(locale)} />;
}
