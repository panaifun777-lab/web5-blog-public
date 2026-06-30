'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/avatar/particle-avatar.tsx
// 3D 粒子分身可视化（移植自 PLVTVS ParticleAvatar.tsx）
// 简化版：Canvas 2D 粒子系统（避免 Three.js 重量级依赖）
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';

interface ParticleAvatarProps {
  size?: number;
  seed?: string;
  phase?: 'void' | 'ritual' | 'revelation' | 'dashboard';
  explode?: number; // 0-1，控制粒子飞散程度
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  z: number; // 用于深度
  vx: number;
  vy: number;
  vz: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  color: string;
  size: number;
}

const COLORS = ['#00FFCC', '#0066FF', '#FFCC00', '#B080E8'];

// 简单 hash → seed
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function ParticleAvatar({
  size = 240,
  seed = 'web5-blog-default',
  phase = 'void',
  explode = 0,
  className,
}: ParticleAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef(phase);
  const explodeRef = useRef(explode);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    explodeRef.current = explode;
  }, [explode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // 初始化粒子（头-肩-躯干几何分布）
    const seedNum = hashString(seed);
    const particleCount = 220;
    const particles: Particle[] = [];
    const cx = size / 2;
    const cy = size / 2;

    for (let i = 0; i < particleCount; i++) {
      const rng = ((seedNum + i * 9301 + 49297) % 233280) / 233280;
      const rng2 = ((seedNum + i * 49297 + 9301) % 233280) / 233280;
      const rng3 = ((seedNum + i * 233280 + 49297) % 233280) / 233280;

      // 头部 35%，肩部 20%，躯干 45%
      let r: number, angle: number, yOffset: number;
      if (rng < 0.35) {
        // 头：椭圆
        r = 35 + rng2 * 20;
        angle = rng3 * Math.PI * 2;
        yOffset = -45;
      } else if (rng < 0.55) {
        // 肩
        r = 50 + rng2 * 30;
        angle = rng3 * Math.PI * 2;
        yOffset = -10;
      } else {
        // 躯干
        r = 40 + rng2 * 35;
        angle = rng3 * Math.PI * 2;
        yOffset = 30 + rng3 * 30;
      }
      const px = cx + Math.cos(angle) * r;
      const py = cy + yOffset + Math.sin(angle) * r * 0.7;

      particles.push({
        x: px,
        y: py,
        z: rng * 30,
        vx: 0,
        vy: 0,
        vz: 0,
        baseX: px,
        baseY: py,
        baseZ: rng * 30,
        color: COLORS[i % COLORS.length],
        size: 1 + rng2 * 1.5,
      });
    }
    particlesRef.current = particles;

    let time = 0;
    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, size, size);

      // 背景径向渐变
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
      grad.addColorStop(0, 'rgba(0, 255, 204, 0.04)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      const expl = explodeRef.current;
      const currentPhase = phaseRef.current;

      particles.forEach((p, i) => {
        // 粒子轻微浮动
        const wobble = Math.sin(time * 1.5 + i * 0.1) * 1.5;
        const targetX = p.baseX + wobble;
        const targetY = p.baseY + Math.cos(time * 1.2 + i * 0.15) * 1.2;

        // 爆炸时飞散
        const explodeForce = expl * 8;
        const dx = p.baseX - cx;
        const dy = p.baseY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx = (p.vx + (targetX - p.x) * 0.08 + (dx / dist) * explodeForce) * 0.85;
        p.vy = (p.vy + (targetY - p.y) * 0.08 + (dy / dist) * explodeForce) * 0.85;
        p.x += p.vx;
        p.y += p.vy;

        // 深度透视
        const depth = 1 + (p.z / 60) * 0.3;
        const alpha = currentPhase === 'void'
          ? 0.3 + expl * 0.7
          : currentPhase === 'revelation'
            ? 0.8 + Math.sin(time * 4 + i) * 0.2
            : 0.6;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * depth, 0, Math.PI * 2);
        ctx.fill();

        // 辉光
        if (currentPhase === 'revelation' || currentPhase === 'dashboard') {
          ctx.globalAlpha = alpha * 0.3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * depth * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // ritual 阶段扫描线
      if (currentPhase === 'ritual') {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#00FFCC';
        ctx.lineWidth = 1;
        const scanY = (time * 80) % size;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(size, scanY);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(rafRef.current);
  }, [size, seed]);

  return (
    <div className={`relative ${className || ''}`} style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        className="block"
        aria-label={`Particle Avatar for ${seed}`}
      />
    </div>
  );
}
