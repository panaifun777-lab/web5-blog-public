import type { Metadata } from 'next';
import '../globals.css';
import { notFound } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { PREFIXED_LOCALES, coerceLocale } from '@/lib/i18n/routing';
import { siteMetadata } from '@/lib/i18n/metadata';
import { RootDocument } from '@/components/web5/layout/root-document';

export const revalidate = 300;

// Only the non-default locales own a URL prefix. `dynamicParams = false`
// turns any other first segment (`/xx`) into a 404 instead of rendering.
export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIXED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return siteMetadata(coerceLocale(locale));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const code = coerceLocale(locale);
  if (code === DEFAULT_LOCALE) notFound();
  return <RootDocument locale={code}>{children}</RootDocument>;
}
