import type { Metadata } from 'next';
import Home from '@/views/home';
import { coerceLocale } from '@/lib/i18n/routing';
import { homeMetadata } from '@/lib/i18n/pages';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return homeMetadata(coerceLocale(locale));
}

export default function Page() {
  return <Home />;
}
