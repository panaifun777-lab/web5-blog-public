import { ImageResponse } from 'next/og';
import { OgImageContent, OG_IMAGE_ALT, OG_IMAGE_SIZE } from '@/components/web5/layout/og-image';

export const alt = OG_IMAGE_ALT;
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(<OgImageContent />, { ...size });
}
