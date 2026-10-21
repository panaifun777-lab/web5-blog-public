import { ImageResponse } from 'next/og';

export const alt = 'Web5.blog — Vessel-Native Blog Ontology Gateway';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: '#050810',
          backgroundImage:
            'radial-gradient(circle at 82% 18%, #003a33 0%, transparent 55%), radial-gradient(circle at 8% 92%, #1a1030 0%, transparent 50%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              backgroundColor: '#00FFCC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#050810',
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            W
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>Web5.blog</span>
            <span style={{ fontSize: 16, color: '#7fe8d8', letterSpacing: 4 }}>
              VESSEL-NATIVE ONTOLOGY GATEWAY
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
            Write once. Archive transparently.
          </span>
          <span style={{ fontSize: 30, color: '#9aa8b8', maxWidth: 900 }}>
            Readable by humans and AI, with provenance shown per article.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: '#66788a' }}>
          <span>Prime · Eidolon · Vessel</span>
          <span>Circle ARC Mainnet · 5042</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
