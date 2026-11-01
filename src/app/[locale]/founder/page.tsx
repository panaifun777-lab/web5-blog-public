import type { Metadata } from 'next';
import Founder from '@/views/founder';
import { coerceLocale } from '@/lib/i18n/routing';
import { founderMetadata } from '@/lib/i18n/pages';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return founderMetadata(coerceLocale(locale));
}

export default function Page() {
  return <Founder />;
}
