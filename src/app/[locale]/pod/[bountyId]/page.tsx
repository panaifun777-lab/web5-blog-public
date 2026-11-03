import type { Metadata } from 'next';
import PodPage, { podMetadata } from '@/views/pod';

// Mirrors `app/(default)/pod/[bountyId]`. The pod view is currently zh-only
// (its copy is not yet localized); the route exists so the language switcher
// resolves here instead of 404-ing. Localization is a later catalog pass.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; bountyId: string }>;
}): Promise<Metadata> {
  const { bountyId } = await params;
  return podMetadata(bountyId);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; bountyId: string }>;
}) {
  const { bountyId } = await params;
  return <PodPage bountyId={bountyId} />;
}
