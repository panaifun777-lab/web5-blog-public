import type { Metadata } from 'next';
import PodPage, { podMetadata } from '@/views/pod';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bountyId: string }>;
}): Promise<Metadata> {
  const { bountyId } = await params;
  return podMetadata(bountyId);
}

export default async function Page({
  params,
}: {
  params: Promise<{ bountyId: string }>;
}) {
  const { bountyId } = await params;
  return <PodPage bountyId={bountyId} />;
}
