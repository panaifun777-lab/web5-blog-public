import type { Metadata } from 'next';
import TaskPage from '@/views/task';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { buildTaskMetadata } from '@/lib/web5/ap2/task-browse';

// Same window as the article detail page and the site layout: a settled or
// claimed bounty shows up within five minutes instead of at the next deploy.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderId: string }>;
}): Promise<Metadata> {
  const { orderId } = await params;
  return buildTaskMetadata(orderId, DEFAULT_LOCALE);
}

export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <TaskPage orderId={orderId} locale={DEFAULT_LOCALE} />;
}
