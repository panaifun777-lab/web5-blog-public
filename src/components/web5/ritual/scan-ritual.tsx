'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/ritual/scan-ritual.tsx
// ScanRitual 容器唤醒动效（四步握手的视觉化映射）
//   Phase 1 (void, 0-800ms):    Vessel Challenge 生成
//   Phase 2 (ritual, 800-1200ms): AA2P Handshake + Eidolon Sign
//   Phase 3 (revelation, 1200-1800ms): Prime Delegation Check + Vessel Token Issue
//   Phase 4 (dashboard, 1800ms+): 完成进入控制台
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from 'react';
import { ParticleAvatar } from '@/components/web5/avatar/particle-avatar';
import { getAudioEngine } from '@/lib/web5/audio-engine';
import { createVesselChallenge, requestVesselSignature, parseSessionResponse, revokeVesselSession } from '@/lib/web5/vessel-auth';
import { getOrCreateVesselWallet } from '@/lib/web5/vessel-wallet';
import type { VesselSession } from '@/lib/web5/types';

type RitualPhase = 'idle' | 'void' | 'ritual' | 'revelation' | 'complete' | 'error';

const PHASE_LOGS: Record<RitualPhase, string[]> = {
  idle: [],
  void: [
    '> INITIALIZING VESSEL AWAKENING PROTOCOL...',
    '> Generating AP2 challenge nonce...',
    '> Requesting vessel endpoint at plvtvs.one...',
  ],
  ritual: [
    '> AA2P handshake initiated',
    '> Vessel signature acquired',
    '> Verifying soul credential...',
  ],
  revelation: [
    '> Querying Prime delegation from eidolonos.xyz...',
    '> Session Key authorized',
    '> Issuing Vessel Session Token...',
  ],
  complete: ['> VESSEL AWAKENED. Welcome to Web5.blog.'],
  error: ['> AUTHENTICATION FAILED. Vessel not awakened.'],
};

interface ScanRitualProps {
  onSuccess?: (session: VesselSession) => void;
  onError?: (err: Error) => void;
  seed?: string;
  walletAddress?: string; // 真实钱包地址（身份统一：容器登录也绑定真实钱包）
}

export function ScanRitual({ onSuccess, onError, seed = 'web5-blog-default', walletAddress }: ScanRitualProps) {
  const [phase, setPhase] = useState<RitualPhase>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [explode, setExplode] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const audio = typeof window !== 'undefined' ? getAudioEngine() : null;

  // 自动滚动日志
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const appendLogs = useCallback((newLogs: string[]) => {
    setLogs((prev) => [...prev, ...newLogs]);
  }, []);

  const startRitual = useCallback(async () => {
    if (phase !== 'idle' && phase !== 'error') return;
    setError(null);
    setLogs([]);
    setProgress(0);
    setExplode(0);

    try {
      // Phase 1: void — 生成 Vessel Challenge（真实 Step 1）
      setPhase('void');
      audio?.playVoid();
      const challenge = createVesselChallenge(['read', 'comment', 'micropay']);
      appendLogs([
        '> INITIALIZING VESSEL AWAKENING PROTOCOL...',
        `> Generating AP2 challenge nonce: ${challenge.nonce.slice(0, 8)}...`,
        '> Requesting vessel endpoint at plvtvs.one...',
      ]);
      setProgress(20);
      await sleep(600);

      // Phase 2: ritual — AA2P Handshake（纯动画，不阻塞）
      setPhase('ritual');
      audio?.playRitual();
      appendLogs([
        '> AA2P handshake initiated',
        '> Synchronizing sovereign identity...',
      ]);
      setProgress(45);
      await sleep(700);

      // 静默获取已连接钱包地址（eth_accounts 不弹窗，不阻塞动画）
      let addr = '';
      try {
        const ethereum = (window as any).ethereum;
        if (ethereum) {
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts[0]) addr = (accounts[0] || '').toLowerCase();
        }
      } catch {}

      if (addr) {
        appendLogs([
          '> Wallet identity detected ✓',
          `> Vessel DID: did:vessel:${addr.slice(0, 10)}...`,
        ]);
      } else {
        appendLogs([
          '> No wallet connected — entering observer mode',
          '> Bind wallet later to unlock full privileges',
        ]);
      }
      setProgress(65);
      await sleep(300);

      // Phase 3: revelation — 后端验证并签发身份 Token
      setPhase('revelation');
      audio?.playRevelation();
      appendLogs([
        '> Querying Prime delegation...',
        '> Session Key authorized',
        '> Issuing Observer Session Token...',
      ]);
      setExplode(1);
      setProgress(80);

      // 动画内不弹签名框：无签名一律走只读 Observer 会话，
      // 完整权限需用户主动点击钱包登录并签署消息。
      const vessel = getOrCreateVesselWallet();
      const walletAddress = addr || vessel.address;
      const res = await fetch('/api/auth/observer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown' }));
        throw new Error(err.error || `Vessel auth failed: ${res.status}`);
      }

      const raw = await res.json();
      const rawSession = raw.session || raw;
      const session = parseSessionResponse(rawSession);

      // 持久化会话
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('web5_vessel_session', JSON.stringify({
          ...session,
          ap2Budget: {
            ...session.ap2Budget,
            dailyLimit: session.ap2Budget.dailyLimit.toString(),
            perTxLimit: session.ap2Budget.perTxLimit.toString(),
          },
        }));
      }

      // Phase 4: complete — 唤醒完成
      setPhase('complete');
      audio?.playDashboard();
      appendLogs(['> VESSEL AWAKENED. Welcome to Web5.blog.']);
      setProgress(100);
      await sleep(400);

      onSuccess?.(session);
    } catch (err) {
      const e = err as Error;
      setError(e.message);
      setPhase('error');
      audio?.playError();
      appendLogs(['> AUTHENTICATION FAILED. Vessel not awakened.']);
      appendLogs([`> ${e.message}`]);
      onError?.(e);
    }
  }, [phase, audio, appendLogs, onSuccess, onError]);

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* 主视觉 */}
      <div className="relative flex justify-center mb-8">
        <ParticleAvatar
          size={280}
          seed={seed}
          phase={phase === 'idle' || phase === 'error' ? 'void' : phase}
          explode={explode}
        />
        {/* 扫描线 */}
        {phase === 'ritual' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
            <div className="cyber-scan-line" />
          </div>
        )}
        {/* 脉冲环 */}
        {(phase === 'revelation' || phase === 'complete') && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-[280px] h-[280px]">
              <div className="cyber-pulse-ring" />
            </div>
          </div>
        )}
      </div>

      {/* 状态标签 */}
      <div className="text-center mb-6">
        <div className="cyber-mono text-xs tracking-widest text-[#00FFCC] opacity-70 mb-2">
          VESSEL AWAKENING PROTOCOL · v1.0
        </div>
        <h2 className="text-2xl font-bold cyber-text-glow-cyan">
          {phase === 'idle' && 'AWAKEN VESSEL'}
          {phase === 'void' && 'INITIALIZING...'}
          {phase === 'ritual' && 'AA2P HANDSHAKE...'}
          {phase === 'revelation' && 'DELEGATION VERIFIED'}
          {phase === 'complete' && 'VESSEL AWAKENED'}
          {phase === 'error' && 'AWAKENING FAILED'}
        </h2>
      </div>

      {/* 进度条 */}
      {phase !== 'idle' && phase !== 'error' && (
        <div className="mb-6">
          <div className="cyber-loading-bar h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00FFCC] transition-all duration-500"
              style={{ width: `${progress}%`, boxShadow: '0 0 8px #00FFCC' }}
            />
          </div>
          <div className="text-right cyber-mono text-xs text-[#00FFCC] mt-1">
            {progress}%
          </div>
        </div>
      )}

      {/* 日志流 */}
      {logs.length > 0 && (
        <div
          ref={logRef}
          className="cyber-panel max-h-32 overflow-y-auto mb-6 cyber-mono text-xs leading-relaxed"
        >
          {logs.map((log, i) => (
            <div
              key={i}
              className={`cyber-fade-in ${
                log.includes('FAILED') || log.includes('ERROR')
                  ? 'text-[#ff4444]'
                  : log.includes('AWAKENED')
                    ? 'text-[#FFCC00] cyber-text-glow-gold'
                    : 'text-[#00FFCC]'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="cyber-panel mb-6 text-sm text-[#ff4444] border border-[#ff4444]/30">
          <div className="cyber-mono text-xs mb-1 opacity-70">ERROR DETAILS</div>
          {error}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={startRitual}
          disabled={phase !== 'idle' && phase !== 'error'}
          className="cyber-btn flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {phase === 'idle' && '> AWAKEN VESSEL'}
          {phase === 'void' && '> INITIALIZING...'}
          {phase === 'ritual' && '> HANDSHAKING...'}
          {phase === 'revelation' && '> VERIFYING...'}
          {phase === 'complete' && '> AWAKENED ✓'}
          {phase === 'error' && '> RETRY'}
        </button>
        {phase === 'complete' && (
          <button
            onClick={() => {
              revokeVesselSession();
              setPhase('idle');
              setLogs([]);
              setProgress(0);
              setExplode(0);
            }}
            className="cyber-btn-gold"
          >
            RESET
          </button>
        )}
      </div>

      {/* 协议提示 */}
      <div className="mt-6 text-center cyber-mono text-xs text-[#666]">
        <div>
          AP2 · ARP · AA2P · ERC-4337
        </div>
        <div className="mt-1 opacity-60">
          全球首创容器登录范式 — 从 Web3 钱包登录到 Web5 容器唤醒
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
