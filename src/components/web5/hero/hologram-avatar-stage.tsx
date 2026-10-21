'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/hero/hologram-avatar-stage.tsx
// 赛博全息量子分身舞台 (Hologram Avatar Stage)
// 移植自 plvtvs.one / plvtvs.network 的 3D 粒子光环、磁场共振与量子遥测 HUD
// ════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Hash, FileText, Sparkles, ExternalLink, Activity, Cpu } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Particle {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
  layer: 'inner' | 'outer' | 'cloud';
}

export function HologramAvatarStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  useEffect(() => {
    setMounted(true);
  }, []);

  // ━━ 3D 量子粒子场与鼠标磁场微动引擎 ━━
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || 340);
    let height = (canvas.height = canvas.offsetHeight || 340);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 340;
      height = canvas.height = canvas.offsetHeight || 340;
    };
    window.addEventListener('resize', handleResize);

    // 粒子调色盘: Prime (金色), Eidolon (青色), Vessel (紫色)
    const colors = ['#00FFCC', '#FFCC00', '#B080E8', '#0066FF'];

    // 初始化 3D 粒子双核
    const numParticles = 320;
    const particles: Particle[] = [];

    for (let i = 0; i < numParticles; i++) {
      const isInner = i < 140;
      const radius = isInner ? 35 + Math.random() * 25 : 70 + Math.random() * 55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      particles.push({
        x, y, z,
        baseX: x, baseY: y, baseZ: z,
        size: isInner ? 1.5 + Math.random() * 1.5 : 1.0 + Math.random() * 1.2,
        color: colors[i % colors.length],
        speed: (0.008 + Math.random() * 0.012) * (isInner ? 1.2 : 0.8),
        phase: Math.random() * Math.PI * 2,
        layer: isInner ? 'inner' : 'outer',
      });
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // 1. 绘制极客同心坐标刻度环
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.08)';
      ctx.lineWidth = 1;

      // 外环
      ctx.beginPath();
      ctx.arc(centerX, centerY, 130, 0, Math.PI * 2);
      ctx.stroke();

      // 内环 (带虚线旋转)
      ctx.beginPath();
      ctx.setLineDash([4, 8]);
      ctx.arc(centerX, centerY, 80, time * 0.3, time * 0.3 + Math.PI * 2);
      ctx.stroke();

      // 十字瞄准基准线
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.moveTo(centerX - 145, centerY);
      ctx.lineTo(centerX + 145, centerY);
      ctx.moveTo(centerX, centerY - 145);
      ctx.lineTo(centerX, centerY + 145);
      ctx.stroke();
      ctx.restore();

      // 2. 3D 旋转矩阵参数 (结合鼠标位置微动)
      const rotY = time * 0.4 + mousePos.x * 0.6;
      const rotX = Math.sin(time * 0.2) * 0.3 + mousePos.y * 0.5;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // 3. 排序与投影粒子
      const projected = particles.map(p => {
        // 呼吸律动 (Quantum Breathing)
        const breathe = Math.sin(time * 1.5 + p.phase) * 6;
        const currentR = 1 + breathe / 80;

        let px = p.baseX * currentR;
        let py = p.baseY * currentR;
        let pz = p.baseZ * currentR;

        // 鼠标磁场斥力与扰动
        if (isHovered) {
          const dx = px - mousePos.x * 120;
          const dy = py - mousePos.y * 120;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            const force = (1 - dist / 80) * 18;
            px += (dx / (dist || 1)) * force;
            py += (dy / (dist || 1)) * force;
          }
        }

        // Y 轴旋转
        const x1 = px * cosY - pz * sinY;
        const z1 = px * sinY + pz * cosY;

        // X 轴旋转
        const y2 = py * cosX - z1 * sinX;
        const z2 = py * sinX + z1 * cosX;

        // 透视投影
        const cameraDist = 260;
        const scale = cameraDist / (cameraDist + z2);
        const screenX = centerX + x1 * scale;
        const screenY = centerY + y2 * scale;
        const alpha = Math.max(0.15, Math.min(1, (z2 + 120) / 240));

        return {
          screenX,
          screenY,
          size: p.size * scale,
          color: p.color,
          alpha,
          z: z2,
        };
      });

      // 深度排序 (Z-index)
      projected.sort((a, b) => a.z - b.z);

      // 4. 批量绘制粒子并叠加辉光
      for (const p of projected) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mounted, mousePos, isHovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setMousePos({ x, y });
  };

  if (!mounted) {
    return <div className="w-full h-96 rounded-2xl bg-white/[0.01] border border-white/[0.04] animate-pulse" />;
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMousePos({ x: 0, y: 0 }); }}
      className="relative rounded-2xl border border-white/[0.08] bg-[#050508]/80 backdrop-blur-xl p-5 overflow-hidden shadow-2xl transition-all hover:border-[#00FFCC]/30 group"
    >
      {/* 赛博网格背景微纹理 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />
      
      {/* 顶部量子遥测 HUD 状态条 (来自 plvtvs.one) */}
      <div className="relative z-10 flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06] text-[10px] font-mono tracking-widest text-[#888]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00FFCC] animate-pulse shadow-[0_0_8px_#00FFCC]" />
          <span className="text-[#00FFCC] font-bold">SYSTEM: OPERATIONAL</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-[#666]">CHAIN: ARC-5042</span>
          <span className="text-[#FFCC00]">MODE: PREVIEW</span>
        </div>
      </div>

      {/* 3D 赛博全息粒子舞台 */}
      <div className="relative w-full h-64 flex items-center justify-center my-1">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair"
        />
        
        {/* 中心微浮标识 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[9px] font-mono tracking-[0.4em] text-[#00FFCC] uppercase opacity-40 mb-1">
            EIDOLON MATRIX
          </div>
          <div className="text-xs font-black font-mono tracking-widest text-white/90">
            SOUL CONTAINER
          </div>
        </div>
      </div>

      {/* 灵魂宣言 (来自 plvtvs.one 核心文案) */}
      <div className="relative z-10 text-center space-y-2 mt-2 pt-3 border-t border-white/[0.04]">
        <div className="text-[10px] font-mono tracking-[0.3em] text-[#FFCC00] uppercase cyber-flicker">
          QUANTUM IDENTITY CORE · V: 2.0.26
        </div>
        <h3 className="text-base sm:text-lg font-black tracking-wider text-white font-mono leading-tight">
          YOUR SOUL IN
          <br />
          <span className="text-[#00FFCC]" style={{ textShadow: '0 0 20px rgba(0,255,204,0.3)' }}>
            THE WIRELESS SHELL.
          </span>
        </h3>
        <p className="text-[11px] text-[#888] leading-relaxed max-w-xs mx-auto">
          {isEn
            ? 'A sovereign avatar that reads, writes and publishes on your behalf — every action auditable.'
            : '代为阅读、写作与发布的高维数字分身，每一次行动都可回溯审计。'}
        </p>
        <div className="pt-1">
          <Badge className="bg-[#00FFCC]/10 text-[#00FFCC] border-[#00FFCC]/30 text-[9px] font-mono py-0.5 tracking-widest">
            BEYOND AGENTS
          </Badge>
        </div>
      </div>

      {/* 协议状态（内测展示，非收益承诺） */}
      <div className="relative z-10 mt-5 pt-3.5 border-t border-white/[0.06] space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
          <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
            <div className="text-sm font-bold text-[#00FFCC]">PROV</div>
            <div className="text-[9px] text-[#666]">{isEn ? 'Provenance' : '存证可查'}</div>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
            <div className="text-sm font-bold text-[#FFCC00]">x402</div>
            <div className="text-[9px] text-[#666]">{isEn ? 'Beta' : '内测'}</div>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
            <div className="text-sm font-bold text-[#10B981]">80%*</div>
            <div className="text-[9px] text-[#666]">{isEn ? 'Planned' : '规划分成'}</div>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/[0.04]">
            <div className="text-sm font-bold text-[#B080E8]">USDC</div>
            <div className="text-[9px] text-[#666]">{isEn ? 'Gas Token' : '原生 Gas'}</div>
          </div>
        </div>
        <p className="text-[9px] text-[#555] font-mono text-center">
          {isEn ? '*Planned split, not yet enforced on-chain.' : '*规划中的分成比例，尚未在链上执行。'}
        </p>

        {/* 协议与发现链接 */}
        <div className="flex items-center justify-between text-[10px] text-[#666] font-mono px-1">
          <a href="/admin" className="hover:text-[#00FFCC] transition-colors flex items-center gap-1">
            <Shield className="w-3 h-3" /> Admin
          </a>
          <a href="/api/openapi.json" target="_blank" className="hover:text-[#00FFCC] transition-colors flex items-center gap-1">
            <Hash className="w-3 h-3" /> OpenAPI
          </a>
          <a href="/llms.txt" target="_blank" className="hover:text-[#00FFCC] transition-colors flex items-center gap-1">
            <FileText className="w-3 h-3" /> LLMs.txt
          </a>
        </div>
      </div>
    </div>
  );
}
