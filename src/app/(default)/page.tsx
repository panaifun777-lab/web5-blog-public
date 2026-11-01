import type { Metadata } from 'next';
import Home from '@/views/home';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { homeMetadata } from '@/lib/i18n/pages';

export const metadata: Metadata = homeMetadata(DEFAULT_LOCALE);

export default function Page() {
  return <Home />;
}
