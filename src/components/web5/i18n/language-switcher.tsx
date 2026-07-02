'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/i18n/language-switcher.tsx
// 多语言切换 — 使用 useI18n hook 实现实时翻译同步
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useI18n, LOCALES, type LocaleCode } from '@/lib/i18n/index';

const locales = Object.values(LOCALES);

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const i18n = useI18n();

  const locale = i18n.locale;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const switchLocale = (code: LocaleCode) => {
    try { localStorage.setItem('web5_locale', code); } catch {}
    i18n.setLocale(code);
    setOpen(false);
  };

  const current = locales.find(l => l.code === locale) || locales[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#999] hover:text-[#00FFCC] hover:bg-[#00FFCC]/10 transition-colors"
        title={current.nativeLabel}
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{current.flag} {current.nativeLabel}</span>
        <span className="sm:hidden">{current.flag}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded shadow-2xl z-50 min-w-[140px]">
          {locales.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[#1a1a1a] transition-colors ${
                locale === l.code ? 'text-[#00FFCC] bg-[#00FFCC]/5' : 'text-[#999]'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.nativeLabel}</span>
              {locale === l.code && <span className="ml-auto text-[#00FFCC]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
