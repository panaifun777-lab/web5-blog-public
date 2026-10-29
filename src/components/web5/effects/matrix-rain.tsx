'use client';

import React, { useEffect, useState, useRef } from 'react';

/* ──────────────────────────────────────────────
 * MatrixRain — CSS-only Matrix "digital rain" effect
 *
 * Renders 12–16 columns of vertically‑falling katakana,
 * numbers, and hex characters using pure CSS @keyframes
 * (no canvas). Green‑on‑black with variable speed, opacity,
 * and a subtle glow on the head characters.
 * ────────────────────────────────────────────── */

const CHARACTERS = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEF';

// ── helpers ──────────────────────────────────

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pickChar(): string {
  return CHARACTERS[randInt(0, CHARACTERS.length - 1)];
}

// ── per‑column configuration ─────────────────

interface ColumnData {
  id: number;
  leftPct: number;
  chars: string[];
  duration: number;    // seconds (2–5)
  delay: number;       // seconds, negative so columns are mid‑fall on load
  fontSize: number;    // px (14–20)
  opacityBase: number; // trail character opacity (0.05–0.2)
  opacityHead: number; // head character opacity (0.5–0.8)
}

function buildColumns(count: number): ColumnData[] {
  const cols: ColumnData[] = [];

  for (let i = 0; i < count; i++) {
    const n = randInt(15, 25);
    const chars: string[] = [];
    for (let j = 0; j < n; j++) chars.push(pickChar());

    cols.push({
      id: i,
      leftPct: (i / count) * 100 + rand(-1.5, 1.5),
      chars,
      duration: rand(2, 5),
      delay: -rand(0, 5), // negative → animation starts mid‑cycle
      fontSize: rand(14, 20),
      opacityBase: rand(0.05, 0.2),
      opacityHead: rand(0.5, 0.8),
    });
  }

  return cols;
}

// ── shared styles ────────────────────────────

const CONTAINER_STYLE: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  backgroundColor: 'transparent',
  fontFamily: '"MS Gothic", "Noto Sans SC", "SimHei", monospace',
};

const CHARACTER_STYLE: React.CSSProperties = {
  color: '#00FF41',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  transition: 'none',
};

// ── component ────────────────────────────────

export interface MatrixRainProps {
  /** Extra class name to forward to the root element */
  className?: string;
  /** Number of columns (default: random 12–16) */
  columns?: number;
}

export function MatrixRain({ className = '', columns: colCount }: MatrixRainProps) {
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const uid = useRef(Math.random().toString(36).substring(2, 10));
  const cols = useRef<ColumnData[] | null>(null);

  useEffect(() => {
    cols.current = buildColumns(colCount ?? randInt(12, 16));
    setReady(true);
  }, [colCount]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const animName = `matrix-fall-${uid.current}`;
  const activeCols = cols.current;

  return (
    <div
      className={className}
      style={CONTAINER_STYLE}
      aria-hidden="true"
      role="presentation"
    >
      {/* 纯装饰：隐藏于辅助技术与文本提取；用户要求减弱动效时整块不渲染 */}
      {ready && activeCols && !reducedMotion && (
        <>
          {/* single shared keyframe – each column sets its own duration/delay inline */}
          <style>{`
@keyframes ${animName} {
  0%   { transform: translateY(-100vh); }
  100% { transform: translateY(100vh); }
}
`}</style>

          {activeCols.map((col) => {
            const n = col.chars.length;
            return (
              <div
                key={col.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${Math.max(0, Math.min(100, col.leftPct))}%`,
                  height: '100%',
                  overflow: 'hidden',
                  width: col.fontSize,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    animation: `${animName} ${col.duration}s linear infinite`,
                    animationDelay: `${col.delay}s`,
                    willChange: 'transform',
                    fontSize: col.fontSize,
                    lineHeight: 1,
                  }}
                >
                  {col.chars.map((ch, idx) => {
                    /* Characters are brighter toward the bottom (the "head").
                       The head is the last few characters of the column. */
                    const t = idx / n;
                    const opacity = col.opacityBase + (col.opacityHead - col.opacityBase) * t;
                    const isHead = idx >= n - 3;

                    return (
                      <span
                        key={idx}
                        style={{
                          ...CHARACTER_STYLE,
                          opacity,
                          textShadow: isHead
                            ? '0 0 4px #00FF41, 0 0 10px #00FF41'
                            : 'none',
                        }}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
