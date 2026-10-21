'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh">
      <body style={{ background: '#050810', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ fontSize: 12, letterSpacing: 6, color: '#FF66AA' }}>APPLICATION ERROR</div>
          <h1 style={{ fontSize: 22, margin: 0 }}>应用发生异常</h1>
          <p style={{ fontSize: 13, color: '#888', maxWidth: 420, textAlign: 'center' }}>
            {error.message || 'Unknown error'}
          </p>
          <button
            onClick={reset}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#00FFCC', color: '#000', fontWeight: 700, border: 0 }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
