import type { Metadata } from 'next';
import Founder from '@/views/founder';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { founderMetadata } from '@/lib/i18n/pages';

export const metadata: Metadata = founderMetadata(DEFAULT_LOCALE);

export default function Page() {
  return <Founder />;
}
