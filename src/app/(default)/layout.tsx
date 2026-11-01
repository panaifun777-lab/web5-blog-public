import type { Metadata } from 'next';
import '../globals.css';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { siteMetadata } from '@/lib/i18n/metadata';
import { RootDocument } from '@/components/web5/layout/root-document';

// Static pages are revalidated every 5 minutes so the feed and provenance
// status do not get pinned in edge caches indefinitely.
export const revalidate = 300;

export const metadata: Metadata = siteMetadata(DEFAULT_LOCALE);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument locale={DEFAULT_LOCALE}>{children}</RootDocument>;
}
