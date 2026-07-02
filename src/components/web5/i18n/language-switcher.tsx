'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/i18n/language-switcher.tsx
// 多语言切换 — 极简版本，零依赖，零 Context
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';

const LOCALES = [
  { code: 'zh-CN' as const, label: '简体中文', flag: '🇨🇳' },
  { code: 'en' as const,    label: 'English',  flag: '🇺🇸' },
  { code: 'ja' as const,    label: '日本語',   flag: '🇯🇵' },
  { code: 'ko' as const,    label: '한국어',   flag: '🇰🇷' },
  { code: 'es' as const,    label: 'Español',  flag: '🇪🇸' },
];

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(LOCALES[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('web5_locale');
      if (saved) { const f = LOCALES.find(l => l.code === saved); if (f) setCurrent(f); }
    } catch { /* localStorage unavailable */ }
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const switchLocale = (code: typeof LOCALES[0]['code'], l: typeof LOCALES[0]) => {
    try { localStorage.setItem('web5_locale', code); } catch {}
    setCurrent(l);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 h-7 rounded-lg border text-[11px] transition-all hover:scale-105"
        style={{ borderColor: open ? '#00FFCC40' : '#ffffff15', color: open ? '#00FFCC' : '#888', backgroundColor: open ? '#00FFCC10' : 'transparent' }}>
        <Globe className="w-3 h-3" />
        <span>{current.flag}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-xl border overflow-hidden z-50"
          style={{ borderColor: '#ffffff15', backgroundColor: '#0f1420', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {LOCALES.map(l => (
            <button key={l.code} onClick={() => switchLocale(l.code, l)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-all hover:bg-white/[0.06]"
              style={{ color: current.code === l.code ? '#00FFCC' : '#ccc' }}>
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {current.code === l.code && <span className="ml-auto text-[10px] text-[#00FFCC]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
