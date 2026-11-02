import type { Metadata } from 'next';
import TaskPage from '@/views/task';
import { coerceLocale } from '@/lib/i18n/routing';
import { buildTaskMetadata } from '@/lib/web5/ap2/task-browse';

// Mirrors `app/(default)/task/[orderId]`: one view, one metadata builder, the
// locale comes from the URL segment (the `[locale]` layout 404s any value that
// is not a prefixed locale).
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}): Promise<Metadata> {
  const { locale, orderId } = await params;
  return buildTaskMetadata(orderId, coerceLocale(locale));
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  return <TaskPage orderId={orderId} locale={coerceLocale(locale)} />;
}
