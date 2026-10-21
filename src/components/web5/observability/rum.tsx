'use client';

import { useReportWebVitals } from 'next/web-vitals';

const SAMPLE_RATE = Number(process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE || '0.2');

export function Rum() {
  useReportWebVitals((metric) => {
    if (!Number.isFinite(SAMPLE_RATE) || Math.random() > SAMPLE_RATE) return;
    const payload = JSON.stringify({
      type: 'vital',
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      path: window.location.pathname,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/rum', new Blob([payload], { type: 'application/json' }));
    }
  });

  return null;
}
