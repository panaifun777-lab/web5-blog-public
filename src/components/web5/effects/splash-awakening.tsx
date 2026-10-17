'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/effects/splash-awakening.tsx
// 全屏沉浸式赛博开屏觉醒动画 (Quantum Splash Awakening Screen)
// 包含: 高维数字本体流、3D 粒子汇聚、密码学协议握手动态进度
// ════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { ParticleAvatar } from '@/components/web5/avatar/particle-avatar';

export function SplashAwakening({ onFinished }: { onFinished?: () => void }) {
  const [progress, setProgress] = useState(15);
  const [phaseText, setPhaseText] = useState('ALIGNING ONTOLOGY SHARDS...');
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(48);
      setPhaseText('ESTABLISHING CIRCLE ARC STATE CHANNELS...');
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(82);
      setPhaseText('CALIBRATING DUAL-CORE SOUL VESSEL...');
    }, 800);

    const t3 = setTimeout(() => {
      setProgress(100);
      setPhaseText('SOVEREIGN DIGITAL LIFEFORM READY.');
    }, 1200);

    const t4 = setTimeout(() => {
      setFadeOut(true);
    }, 1500);

    const t5 = setTimeout(() => {
      onFinished?.();
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onFinished]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#050508] flex flex-col items-center justify-center select-none transition-opacity duration-300 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 背景深空辉光 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,204,0.06),transparent_70%)] pointer-events-none" />

      {/* 3D 核心觉醒模型 */}
      <div className="relative mb-6">
        <ParticleAvatar size={180} seed="web5-genesis-splash" phase="revelation" />
      </div>

      {/* 品牌主标 */}
      <div className="flex flex-col items-center space-y-2 text-center z-10 px-4">
        <div className="text-3xl sm:text-4xl font-black tracking-widest text-white font-mono flex items-center gap-1.5">
          <span>W</span><span className="text-[#00FFCC] animate-pulse">•</span>
          <span>B</span><span className="text-[#FFCC00] animate-pulse">•</span>
          <span>O</span><span className="text-[#B080E8] animate-pulse">•</span>
          <span>G</span>
        </div>
        <div className="text-xs sm:text-sm text-[#00FFCC] font-mono tracking-[0.2em] uppercase">
          Web5 Blog Ontology Gateway
        </div>
        <div className="text-[11px] text-[#666] max-w-sm leading-relaxed">
          存在论确权 · 深度思想母体 · 智能体价值网关
        </div>

        {/* 动态进度条 */}
        <div className="w-56 sm:w-72 mt-6">
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#00FFCC] via-[#FFCC00] to-[#0066FF] rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(0,255,204,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-[#555] font-mono mt-2">
            <span className="truncate">{phaseText}</span>
            <span className="text-[#00FFCC] font-bold">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
