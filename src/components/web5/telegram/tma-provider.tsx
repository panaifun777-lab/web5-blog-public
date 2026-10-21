'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/telegram/tma-provider.tsx
// Telegram Mini App (TMA) 客户端环境感知与全屏扩展 Provider
// 自动全屏展开、同步 Telegram 原生色彩、静默获取 initData 并完成极速无感登入
// ════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useEffect, useState } from 'react';

interface TmaContextType {
  isTma: boolean;
  user: any | null;
  initData: string;
}

const TmaContext = createContext<TmaContextType>({
  isTma: false,
  user: null,
  initData: '',
});

export function TmaProvider({ children }: { children: React.ReactNode }) {
  const [isTma, setIsTma] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [initData, setInitData] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 动态注入 Telegram WebApp 官方脚本
    const scriptId = 'telegram-webapp-sdk';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;
      script.onload = () => initTelegramApp();
      document.head.appendChild(script);
    } else {
      initTelegramApp();
    }

    function initTelegramApp() {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.initData) {
        console.log('📱 [TMA Provider] Telegram WebApp detected! Expanding viewport...');
        setIsTma(true);
        setInitData(tg.initData);
        setUser(tg.initDataUnsafe?.user || null);

        // 1. 全屏沉浸式展开
        tg.ready();
        tg.expand();

        // 2. 启用触觉反馈与原生暗色支持
        tg.enableClosingConfirmation();
        if (tg.setHeaderColor) tg.setHeaderColor('#050508');
        if (tg.setBackgroundColor) tg.setBackgroundColor('#050508');

        // 3. 静默调用后端进行 HMAC-SHA256 验签并完成 Vessel 极速建仓
        const stored = sessionStorage.getItem('web5_vessel_session');
        if (!stored) {
          fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.success && res.session) {
                console.log('✅ [TMA Auth] Telegram silent login verified! Vessel awakened.');
                sessionStorage.setItem('web5_vessel_session', JSON.stringify(res.session));
                window.location.reload();
              }
            })
            .catch((err) => console.warn('[TMA Auth] Silent login failed:', err));
        }
      }
    }
  }, []);

  return (
    <TmaContext.Provider value={{ isTma, user, initData }}>
      {children}
    </TmaContext.Provider>
  );
}

export function useTma() {
  return useContext(TmaContext);
}
