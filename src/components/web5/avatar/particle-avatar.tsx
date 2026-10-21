'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/avatar/particle-avatar.tsx
// 3D 灵魂容器登录（Vessel Awakening）核心模型
// 依据用户唯一 seed (DID / 钱包地址) 确定性派生专属高维色谱与光子旋向
// ════════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';

interface ParticleAvatarProps {
  size?: number;
  seed?: string;
  phase?: 'void' | 'ritual' | 'revelation' | 'dashboard' | 'idle' | 'complete' | 'error';
  explode?: number; // 0-1
  className?: string;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

const PHI = (1 + Math.sqrt(5)) / 2;
const BASE_VERTICES: Point3D[] = [
  { x: -1, y:  PHI, z:  0 }, { x:  1, y:  PHI, z:  0 }, { x: -1, y: -PHI, z:  0 }, { x:  1, y: -PHI, z:  0 },
  { x:  0, y: -1, z:  PHI }, { x:  0, y:  1, z:  PHI }, { x:  0, y: -1, z: -PHI }, { x:  0, y:  1, z: -PHI },
  { x:  PHI, y:  0, z: -1 }, { x:  PHI, y:  0, z:  1 }, { x: -PHI, y:  0, z: -1 }, { x: -PHI, y:  0, z:  1 },
];

const EDGES: [number, number][] = [
  [0, 11], [0, 5], [0, 1], [0, 7], [0, 10],
  [1, 5], [5, 11], [11, 10], [10, 7], [7, 1],
  [3, 9], [3, 4], [3, 2], [3, 6], [3, 8],
  [4, 9], [9, 8], [8, 6], [6, 2], [2, 4],
  [1, 9], [5, 4], [11, 2], [10, 6], [7, 8],
  [1, 8], [5, 9], [11, 4], [10, 2], [7, 6],
];

// 确定性哈希函数
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// 依据唯一身份 seed 派生专属 3D 容器色系
function deriveVesselPalette(seedStr: string) {
  const h = hashSeed(seedStr);
  const hue = h % 360;
  const hueAlt = (hue + 140) % 360;
  const hueThird = (hue + 240) % 360;

  return {
    primary: `hsl(${hue}, 100%, 55%)`,
    primaryGlow: `hsla(${hue}, 100%, 55%, 0.7)`,
    accent: `hsl(${hueAlt}, 100%, 65%)`,
    ringGold: `hsl(${hueThird}, 90%, 60%)`,
    wireframeFront: `hsla(${hue}, 90%, 60%, 0.85)`,
    wireframeBack: `hsla(${hueAlt}, 80%, 45%, 0.3)`,
    plasmaStops: [
      `hsl(${hue}, 100%, 60%)`,
      `hsla(${hueAlt}, 100%, 50%, 0.75)`,
      `hsla(${hueThird}, 90%, 45%, 0.25)`,
    ],
  };
}

export function ParticleAvatar({
  size = 280,
  seed = 'web5-vessel-seed',
  phase = 'void',
  explode = 0,
  className,
}: ParticleAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  const explodeRef = useRef(explode);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { explodeRef.current = explode; }, [explode]);

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

    const cx = size / 2;
    const cy = size / 2;

    // 确定性色彩生成
    const palette = deriveVesselPalette(seed);
    const seedH = hashSeed(seed);

    // 量子光子群 (Quantum Swarm)
    const SWARM_COUNT = 85;
    const swarm = Array.from({ length: SWARM_COUNT }, (_, i) => {
      const pRng = ((seedH + i * 49297) % 233280) / 233280;
      return {
        theta: Math.random() * Math.PI * 2,
        phi: Math.acos(Math.random() * 2 - 1),
        radius: 38 + pRng * 50,
        speed: 0.015 + pRng * 0.025,
        size: 1 + pRng * 2,
        color: i % 3 === 0 ? palette.primary : i % 3 === 1 ? palette.accent : palette.ringGold,
      };
    });

    let rotX = 0.2;
    let rotY = 0.3;
    let rotZ = 0;
    let innerRot = 0;
    let time = 0;
    let animationFrameId: number;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, size, size);

      const curPhase = phaseRef.current;
      const expl = explodeRef.current;

      let spinSpeed = 0.012;
      let corePulseSpeed = 2.0;
      let shellScale = 68;
      let coreScale = 22;

      if (curPhase === 'ritual') {
        spinSpeed = 0.045;
        corePulseSpeed = 5.0;
      } else if (curPhase === 'revelation') {
        spinSpeed = 0.08;
        corePulseSpeed = 9.0;
        shellScale = 75 + expl * 18;
        coreScale = 32 + expl * 12;
      } else if (curPhase === 'dashboard' || curPhase === 'complete') {
        spinSpeed = 0.018;
        corePulseSpeed = 2.5;
        shellScale = 72;
        coreScale = 26;
      }

      rotY += spinSpeed;
      rotX += spinSpeed * 0.6;
      rotZ += spinSpeed * 0.3;
      innerRot -= spinSpeed * 1.5;

      // ── 0. 背景深空能量场 ──
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.48);
      if (curPhase === 'revelation') {
        bgGrad.addColorStop(0, palette.primaryGlow);
        bgGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
      } else {
        bgGrad.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
        bgGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      }
      bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);

      // 3D 旋转投影变换
      const project = (p: Point3D, rx: number, ry: number, rz: number, scale: number) => {
        let x1 = p.x * Math.cos(ry) + p.z * Math.sin(ry);
        let y1 = p.y;
        let z1 = -p.x * Math.sin(ry) + p.z * Math.cos(ry);

        let x2 = x1;
        let y2 = y1 * Math.cos(rx) - z1 * Math.sin(rx);
        let z2 = y1 * Math.sin(rx) + z1 * Math.cos(rx);

        let x3 = x2 * Math.cos(rz) - y2 * Math.sin(rz);
        let y3 = x2 * Math.sin(rz) + y2 * Math.cos(rz);
        let z3 = z2;

        const fov = 280;
        const depth = fov / (fov + z3 * scale * 0.012);
        return {
          x: cx + x3 * scale * depth,
          y: cy + y3 * scale * depth,
          z: z3,
          depth,
        };
      };

      // ── 1. 核心内胆：Eidolon 等离子球 ──
      const pulse = Math.sin(time * corePulseSpeed) * 0.15 + 1;
      const coreR = coreScale * pulse;

      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.2);
      coreGlow.addColorStop(0, '#ffffff');
      coreGlow.addColorStop(0.35, palette.plasmaStops[0]);
      coreGlow.addColorStop(0.7, palette.plasmaStops[1]);
      coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.primary;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // ── 2. 量子光子群 ──
      swarm.forEach((pt) => {
        pt.theta += pt.speed * (curPhase === 'ritual' ? 2.5 : 1);
        let r = pt.radius;
        if (curPhase === 'ritual') {
          r = 30 + (pt.radius - 30) * Math.abs(Math.sin(time * 2 + pt.phi));
        } else if (curPhase === 'revelation') {
          r = pt.radius + expl * 45;
        }

        const p3d: Point3D = {
          x: (r / 50) * Math.sin(pt.phi) * Math.cos(pt.theta),
          y: (r / 50) * Math.sin(pt.phi) * Math.sin(pt.theta),
          z: (r / 50) * Math.cos(pt.phi),
        };
        const proj = project(p3d, rotX * 0.8, rotY * 1.2, 0, 50);

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0.2, (proj.depth - 0.7) * 1.5);
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, pt.size * proj.depth, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // ── 3. 外壳晶体：Vessel 二十面体 ──
      const projectedVertices = BASE_VERTICES.map(v => project(v, rotX, rotY, rotZ, shellScale));

      EDGES.forEach(([i, j]) => {
        const v1 = projectedVertices[i];
        const v2 = projectedVertices[j];
        const avgZ = (v1.z + v2.z) / 2;
        const isFront = avgZ > -0.2;

        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);

        ctx.strokeStyle = isFront ? palette.wireframeFront : palette.wireframeBack;
        ctx.lineWidth = isFront ? 1.6 : 0.8;
        ctx.stroke();
      });

      projectedVertices.forEach(v => {
        const alpha = Math.max(0.3, Math.min(1, (v.z + 1.8) / 3));
        ctx.fillStyle = palette.primary;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 2.8 * v.depth, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // ── 4. Prime 赤道高维共振环 ──
      const RING_SEGMENTS = 64;
      const ringRadius = shellScale * 1.35;

      const drawRing = (angleOffset: number, tilt: number, color: string) => {
        ctx.beginPath();
        for (let s = 0; s <= RING_SEGMENTS; s++) {
          const theta = (s / RING_SEGMENTS) * Math.PI * 2 + angleOffset;
          const rp: Point3D = {
            x: (ringRadius / shellScale) * Math.cos(theta),
            y: (ringRadius / shellScale) * Math.sin(theta) * Math.sin(tilt),
            z: (ringRadius / shellScale) * Math.sin(theta) * Math.cos(tilt),
          };
          const pt = project(rp, rotX * 0.4, innerRot, 0, shellScale);
          if (s === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      };

      drawRing(0, 0.35, palette.ringGold);
      drawRing(Math.PI / 2, -0.45, palette.accent);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [size, seed]);

  return (
    <div className={`relative flex items-center justify-center ${className || ''}`} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} className="block pointer-events-none drop-shadow-[0_0_24px_rgba(0,255,204,0.25)]" />
    </div>
  );
}
