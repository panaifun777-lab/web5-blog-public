'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/i18n/global-translator.tsx
// 全球高可用动态全量翻译引擎 (Global Neural Web Translator)
// 能够实时 100% 深度遍历并翻译整个 DOM 树（包括博客流长文、分身致辞全量段落与所有组件）
// 支持 9 大全球主流语言，无缝切换无白屏
// ════════════════════════════════════════════════════════════════

import React, { useEffect } from 'react';

export function GlobalTranslator() {
  useEffect(() => {
    // 注入 Google Web Translation 核心脚本
    const scriptId = 'google-translate-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);

      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'zh-CN',
            includedLanguages: 'zh-CN,en,ja,ko,es,fr,de,ru,ar',
            autoDisplay: false,
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          'google_translate_element'
        );
      };
    }

    // 监听本地语言切换广播事件
    const handleLocaleChange = (e: any) => {
      const lang = e.detail?.language || localStorage.getItem('web5_locale') || 'zh-CN';
      applyGoogleLanguage(lang);
    };

    window.addEventListener('web5_language_changed', handleLocaleChange);
    return () => window.removeEventListener('web5_language_changed', handleLocaleChange);
  }, []);

  return (
    <>
      {/* 隐藏的 Google 原生渲染挂载点 */}
      <div id="google_translate_element" style={{ display: 'none' }} />
      <style jsx global>{`
        /* 屏蔽 Google 翻译自带的顶部横幅和弹窗干扰，保持原生暗黑赛博风格 */
        .goog-te-banner-frame.skiptranslate,
        .goog-te-banner-frame,
        iframe.goog-te-banner-frame,
        .goog-te-balloon-frame,
        #goog-gt-tt {
          display: none !important;
          visibility: hidden !important;
        }
        body {
          top: 0px !important;
        }
        .goog-text-highlight {
          background: transparent !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  );
}

/** 触发翻译引擎切换底层语言 */
export function applyGoogleLanguage(langCode: string) {
  if (typeof window === 'undefined') return;

  // 映射语言代码
  let target = 'zh-CN';
  if (langCode.startsWith('en')) target = 'en';
  else if (langCode.startsWith('ja')) target = 'ja';
  else if (langCode.startsWith('ko')) target = 'ko';
  else if (langCode.startsWith('es')) target = 'es';
  else if (langCode.startsWith('fr')) target = 'fr';
  else if (langCode.startsWith('de')) target = 'de';
  else if (langCode.startsWith('ru')) target = 'ru';
  else if (langCode.startsWith('ar')) target = 'ar';

  // 设置 Google Translate Cookie 实现持久化
  const domain = window.location.hostname;
  document.cookie = `googtrans=/zh-CN/${target}; path=/; domain=${domain}`;
  document.cookie = `googtrans=/zh-CN/${target}; path=/;`;

  // 触发原生 select 联动
  const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
  if (select) {
    select.value = target;
    select.dispatchEvent(new Event('change'));
  } else {
    // 若尚未初始化完成，重新加载以应用 cookie
    const currentTrans = (document.cookie.match(/googtrans=([^;]+)/) || [])[1];
    if (currentTrans !== `/zh-CN/${target}`) {
      window.location.reload();
    }
  }
}
