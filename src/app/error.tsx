'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch('/api/rum', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'error',
        message: error.message,
        digest: error.digest,
        path: window.location.pathname,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-xs font-mono tracking-[0.3em] text-[#FF66AA]">RENDER ERROR</div>
      <h2 className="text-xl font-bold text-white">页面暂时无法渲染</h2>
      <p className="text-xs text-[#888] max-w-md">错误已记录。你可以重试，或返回首页继续浏览。</p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-[#00FFCC] text-black text-xs font-bold"
      >
        重试
      </button>
    </div>
  );
}
