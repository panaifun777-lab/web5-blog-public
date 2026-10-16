'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/avatar/particle-avatar.tsx
// 3D 灵魂容器登录（Vessel Awakening）核心模型
// 「同心高维晶核 · 灵魂共振力场 (Concentric Dual-Core Soul Vessel)」
//
// 三层结构设计映射：
//   1. 外壳 (Vessel 容器层)：3D 二十面体低多边形透明晶体 (Icosahedron)，带有发光线框与旋转光晕，象征 ERC-4337 智能账户
//   2. 内胆 (Eidolon 灵魂层)：悬浮在核心内部的脉冲等离子能量球 (Plasma Core)，带有仿生呼吸起伏，象征 AI 分身意识
//   3. 共振环 (Prime 共识环)：围绕赤道飞速旋转的双量子光环与发光光斑，象征真人本体授权凭证
//
// 四步握手动态映射 (Phases)：
//   • void:       深空暗蓝休眠态，慢频微光脉动，核心冷凝
//   • ritual:     晶格外壳解构反向高速自转，量子光子向核心汇聚注能 (AA2P 握手)
//   • revelation: 核心耀斑爆发超新星高斯辉光，高维共振环剧烈震颤展开
//   • dashboard/complete: 晶核归位合拢锁死，绽放青金双色永动机力场
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

// 黄金分割比构造二十面体顶点
const PHI = (1 + Math.sqrt(5)) / 2;
const BASE_VERTICES: Point3D[] = [
  { x: -1, y:  PHI, z:  0 }, { x:  1, y:  PHI, z:  0 }, { x: -1, y: -PHI, z:  0 }, { x:  1, y: -PHI, z:  0 },
  { x:  0, y: -1, z:  PHI }, { x:  0, y:  1, z:  PHI }, { x:  0, y: -1, z: -PHI }, { x:  0, y:  1, z: -PHI },
  { x:  PHI, y:  0, z: -1 }, { x:  PHI, y:  0, z:  1 }, { x: -PHI, y:  0, z: -1 }, { x: -PHI, y:  0, z:  1 },
];

// 二十面体边索引 (30 条边)
const EDGES: [number, number][] = [
  [0, 11], [0, 5], [0, 1], [0, 7], [0, 10],
  [1, 5], [5, 11], [11, 10], [10, 7], [7, 1],
  [3, 9], [3, 4], [3, 2], [3, 6], [3, 8],
  [4, 9], [9, 8], [8, 6], [6, 2], [2, 4],
  [1, 9], [5, 4], [11, 2], [10, 6], [7, 8],
  [1, 8], [5, 9], [11, 4], [10, 2], [7, 6],
];

export function ParticleAvatar({
  size = 280,
  seed = 'web5-vessel',
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

    // 量子光子群 (Quantum Swarm)
    const SWARM_COUNT = 90;
    const swarm = Array.from({ length: SWARM_COUNT }, (_, i) => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos(Math.random() * 2 - 1),
      radius: 40 + Math.random() * 55,
      speed: 0.015 + Math.random() * 0.03,
      size: 1 + Math.random() * 2,
      color: i % 3 === 0 ? '#00FFCC' : i % 3 === 1 ? '#FFCC00' : '#B080E8',
    }));

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

      // 动态旋转角速度设定 (根据不同握手阶段自适应加速)
      let spinSpeed = 0.012;
      let corePulseSpeed = 2.0;
      let shellScale = 68;
      let coreScale = 22;

      if (curPhase === 'ritual') {
        spinSpeed = 0.045; // 仪式态：外壳高速旋转
        corePulseSpeed = 5.0;
      } else if (curPhase === 'revelation') {
        spinSpeed = 0.08;  // 启示态：光波辐射
        corePulseSpeed = 9.0;
        shellScale = 75 + expl * 18;
        coreScale = 32 + expl * 12;
      } else if (curPhase === 'dashboard' || curPhase === 'complete') {
        spinSpeed = 0.018; // 觉醒态：平稳耀眼
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
        bgGrad.addColorStop(0, 'rgba(0, 255, 204, 0.25)');
        bgGrad.addColorStop(0.5, 'rgba(176, 128, 232, 0.12)');
      } else if (curPhase === 'ritual') {
        bgGrad.addColorStop(0, 'rgba(0, 255, 204, 0.15)');
        bgGrad.addColorStop(0.5, 'rgba(0, 102, 255, 0.08)');
      } else {
        bgGrad.addColorStop(0, 'rgba(0, 255, 204, 0.06)');
        bgGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      }
      bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);

      // 3D 旋转投影变换矩阵
      const project = (p: Point3D, rx: number, ry: number, rz: number, scale: number) => {
        // Y 轴旋转
        let x1 = p.x * Math.cos(ry) + p.z * Math.sin(ry);
        let y1 = p.y;
        let z1 = -p.x * Math.sin(ry) + p.z * Math.cos(ry);

        // X 轴旋转
        let x2 = x1;
        let y2 = y1 * Math.cos(rx) - z1 * Math.sin(rx);
        let z2 = y1 * Math.sin(rx) + z1 * Math.cos(rx);

        // Z 轴旋转
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

      // ── 1. 核心内胆：Eidolon 灵魂等离子球 (带有仿生呼吸起伏) ──
      const pulse = Math.sin(time * corePulseSpeed) * 0.15 + 1;
      const coreR = coreScale * pulse;

      // 核心光晕层
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.2);
      if (curPhase === 'revelation') {
        coreGlow.addColorStop(0, '#ffffff');
        coreGlow.addColorStop(0.3, '#00FFCC');
        coreGlow.addColorStop(0.7, 'rgba(176, 128, 232, 0.5)');
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        coreGlow.addColorStop(0, '#00FFCC');
        coreGlow.addColorStop(0.4, 'rgba(0, 102, 255, 0.8)');
        coreGlow.addColorStop(0.8, 'rgba(176, 128, 232, 0.2)');
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 核心内层高亮珠
      ctx.fillStyle = curPhase === 'revelation' ? '#ffffff' : '#00FFCC';
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // ── 2. 量子光子群 (Quantum Swarm 注能动画) ──
      swarm.forEach((pt) => {
        pt.theta += pt.speed * (curPhase === 'ritual' ? 2.5 : 1);
        let r = pt.radius;
        if (curPhase === 'ritual') {
          // 握手时量子向核心汇聚压缩
          r = 30 + (pt.radius - 30) * Math.abs(Math.sin(time * 2 + pt.phi));
        } else if (curPhase === 'revelation') {
          // 启示时飞散
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

      // ── 3. 外壳晶体：Vessel 智能容器二十面体 (Icosahedron) ──
      const projectedVertices = BASE_VERTICES.map(v => project(v, rotX, rotY, rotZ, shellScale));

      // 绘制 30 条高维发光晶格边框
      EDGES.forEach(([i, j]) => {
        const v1 = projectedVertices[i];
        const v2 = projectedVertices[j];
        const avgZ = (v1.z + v2.z) / 2;
        const isFront = avgZ > -0.2;

        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);

        if (curPhase === 'revelation' || curPhase === 'complete') {
          ctx.strokeStyle = isFront ? 'rgba(0, 255, 204, 0.85)' : 'rgba(0, 102, 255, 0.35)';
          ctx.lineWidth = isFront ? 1.8 : 0.9;
        } else if (curPhase === 'ritual') {
          ctx.strokeStyle = isFront ? 'rgba(176, 128, 232, 0.8)' : 'rgba(0, 255, 204, 0.25)';
          ctx.lineWidth = isFront ? 1.5 : 0.8;
        } else {
          ctx.strokeStyle = isFront ? 'rgba(0, 255, 204, 0.55)' : 'rgba(255, 204, 0, 0.2)';
          ctx.lineWidth = isFront ? 1.2 : 0.6;
        }
        ctx.stroke();
      });

      // 绘制 12 个高维晶核节点
      projectedVertices.forEach(v => {
        const alpha = Math.max(0.3, Math.min(1, (v.z + 1.8) / 3));
        ctx.fillStyle = curPhase === 'revelation' ? '#ffffff' : '#00FFCC';
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 2.8 * v.depth, 0, Math.PI * 2);
        ctx.fill();

        // 节点辉光
        ctx.fillStyle = '#B080E8';
        ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 6 * v.depth, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // ── 4. Prime 赤道高维共振环 (Quantum Rings) ──
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
        ctx.lineWidth = curPhase === 'revelation' ? 1.8 : 1.1;
        ctx.stroke();
      };

      drawRing(0, 0.35, 'rgba(255, 204, 0, 0.7)');       // Prime 金环
      drawRing(Math.PI / 2, -0.45, 'rgba(0, 255, 204, 0.6)'); // Eidolon 青环

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [size, seed]);

  return (
    <div className={`relative flex items-center justify-center ${className || ''}`} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} className="block pointer-events-none drop-shadow-[0_0_24px_rgba(0,255,204,0.35)]" />
    </div>
  );
}
