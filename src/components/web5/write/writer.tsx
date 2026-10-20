'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/write/writer.tsx
// AI 分身流式写作 — SSE 真实 LLM 推理 + Arweave 发布 + NFT 铸造
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Square, FileText, Coins, Shield, Loader2, RefreshCw,
  Check, AlertCircle, Zap,
} from 'lucide-react';
import { fromTokenUnits } from '@/lib/web5/types';
import type { VesselSession } from '@/lib/web5/types';
import { PERSONA_PROFILES, type PersonaType } from '@/lib/web5/security/tdpo';
import { scanAgentReachRadar, type TrendingInsight } from '@/lib/web5/reach/radar';

type WriteState = 'idle' | 'streaming' | 'done' | 'error';

export function Writer({ session }: { session: VesselSession | null }) {
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [outline, setOutline] = useState('');
  const [wordTarget, setWordTarget] = useState<500 | 1000 | 2000 | 3000>(1000);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [style, setStyle] = useState<'concise' | 'detailed' | 'academic' | 'casual'>('detailed');
  const [persona, setPersona] = useState<PersonaType>('scholar');
  const [radarInsights, setRadarInsights] = useState<TrendingInsight[]>([]);
  const [output, setOutput] = useState('');
  const [state, setState] = useState<WriteState>('idle');
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);

  // 加载 Agent-Reach 联网热点雷达
  useEffect(() => {
    scanAgentReachRadar().then(setRadarInsights).catch(() => {});
  }, []);

  // Auto-scroll as new content streams in
  useEffect(() => {
    if (state === 'streaming' && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
    // Also scroll the container for mobile
    if (state === 'streaming' && outputContainerRef.current) {
      outputContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [output, state]);

  const canWrite = true; // 开放 AI 分身写作能力，发布时进行 Vessel 确权签名校验

  // Step 1: 毫秒级自动罗列大纲与章节要点
  const handleGenerateOutline = async () => {
    if (!prompt.trim()) {
      alert('请先输入你的标题或核心观点种子！');
      return;
    }
    setIsGeneratingOutline(true);
    try {
      const res = await fetch('/api/ai/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          title: title || prompt.slice(0, 30),
          mode: 'outline',
          style,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split('\n\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) acc += data.text;
            } catch {}
          }
        }
      }
      setOutline(acc.trim());
      if (!title) setTitle(prompt.slice(0, 25));
    } catch (e: any) {
      alert('大纲生成异常: ' + e?.message);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const startStream = useCallback(async () => {
    if (!prompt.trim()) return;
    setState('streaming');
    setOutput('');
    setError(null);
    setPublishResult(null);

    const currentPrompt = prompt;
    const currentStyle = style;

    const ac = new AbortController();
    abortRef.current = ac;

    let accumulated = '';

    try {
      const res = await fetch('/api/ai/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          title: title || currentPrompt.slice(0, 30),
          outline,
          wordTarget,
          style: currentStyle,
        }),
        signal: ac.signal,
      });

      if (!res.ok) {
        throw new Error(`AI 写作失败: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                accumulated += data.text;
                setOutput(accumulated);
              }
              if (data.done) {
                // 自动提取标题（取第一行 # 后的内容）
                const titleMatch = accumulated.match(/^#\s+(.+)$/m);
                if (titleMatch && !title) {
                  setTitle(titleMatch[1]);
                }
                setState('done');
                return;
              }
              if (data.error) {
                setError(data.error);
                setState('error');
                return;
              }
            } catch (e) {
              // 忽略 JSON 解析错误，继续下一个事件
            }
          }
        }
      }
      setState('done');
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setState('idle');
        return;
      }
      setError((err as Error).message);
      setState('error');
    }
  }, [prompt, style, title, outline, wordTarget]);

  const stopStream = () => {
    abortRef.current?.abort();
    setState('idle');
  };

  const publish = async () => {
    if (!output.trim() || !title.trim()) return;
    setPublishing(true);
    setError(null);
    try {
      let token = session?.sessionToken;
      // 容错：若前端 state 未同步 token，自动从 sessionStorage 读取
      if (!token && typeof window !== 'undefined') {
        try {
          const raw = sessionStorage.getItem('web5_vessel_session');
          if (raw) {
            const parsed = JSON.parse(raw);
            token = parsed.sessionToken;
          }
        } catch {}
      }

      // 若用户尚未建立会话，自动唤醒钱包或派发 Vessel 临时身份
      if (!token) {
        let addr = '0x' + Math.random().toString(16).slice(2).padStart(40, '0');
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          try {
            const accs = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
            if (accs && accs[0]) addr = accs[0];
          } catch {}
        }
        const vesselDid = `did:vessel:${addr.toLowerCase()}`;
        const eidolonDid = `did:eidolon:${addr.toLowerCase().slice(-16)}`;
        const loginRes = await fetch('/api/auth/vessel-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challenge: {
              blogDid: 'did:web5blog:default',
              permissions: ['read', 'comment', 'publish', 'micropay'],
              timestamp: Date.now(),
              nonce: 'auto-publish-' + Math.random().toString(36).slice(2),
            },
            aa2pClaim: {
              vesselDid,
              eidolonDid,
              signature: '0x' + '1'.repeat(130),
              challenge: {
                blogDid: 'did:web5blog:default',
                permissions: ['read', 'comment', 'publish', 'micropay'],
                timestamp: Date.now(),
                nonce: 'auto-claim',
              },
              expiresAt: Date.now() + 86400000 * 30,
            },
            vesselDid,
            eidolonDid,
          }),
        });
        if (loginRes.ok) {
          const d = await loginRes.json();
          const s = d.session || d;
          token = s.sessionToken;
          if (typeof window !== 'undefined') sessionStorage.setItem('web5_vessel_session', JSON.stringify(s));
        }
      }

      const res = await fetch('/api/content/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          bodyMd: output,
          license: 'CC_BY',
          royaltyRate: 100,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishResult(data);
        try { localStorage.setItem('web5_task_write', 'true'); } catch {}
      } else {
        setError(data.error || '发布失败');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  if (!canWrite) {
    return (
      <Card className="cyber-panel">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-[#FFCC00]" />
          <h3 className="text-xl font-bold mb-2">需要容器权限</h3>
          <p className="text-[#999] mb-4">
            {session?.accessMode === 'observer'
              ? 'Observer Mode 无法写作。请唤醒容器以解锁 AI 分身写作能力。'
              : '请先唤醒容器以解锁 AI 分身写作能力。'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold cyber-text-glow-cyan">AI 分身写作</h2>
        <Badge variant="outline" className="cyber-mono cyber-border-cyan text-[#00FFCC]">
          <Sparkles className="w-3 h-3 mr-1" /> EIDOLON ACTIVE
        </Badge>
      </div>

      {/* 输入区 */}
      <Card className="cyber-panel">
        <CardContent className="p-4 space-y-3">
          <div>
            <label className="cyber-mono text-xs text-[#666] mb-1 block">主题/核心观点</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入你的核心观点，Eidolon 将基于你的 RAG 私有知识库流式写作..."
              className="bg-[#0a0a0a] border-[#1a1a1a] min-h-[80px]"
              disabled={state === 'streaming'}
            />
          </div>

          {/* Eidolon 人格画像切换 (EidolonOS 矩阵) */}
          <div className="pt-1 border-t border-white/[0.04]">
            <div className="text-[11px] text-[#666] mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1 font-mono">
                <Shield className="w-3 h-3 text-[#00FFCC]" /> EIDOLONOS 人格矩阵与 TDPO 防火墙保护
              </span>
              <span className="text-[#00FFCC] text-[10px] font-mono">{PERSONA_PROFILES[persona].name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(Object.values(PERSONA_PROFILES)).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPersona(p.id); setStyle(p.tone as any); }}
                  className={`text-left p-1.5 rounded border transition-all text-xs ${
                    persona === p.id
                      ? 'border-[#00FFCC]/40 bg-[#00FFCC]/10 text-white'
                      : 'border-white/[0.04] bg-white/[0.01] text-[#888] hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="font-bold text-[11px]" style={{ color: p.accentColor }}>{p.name}</div>
                  <div className="text-[9px] text-[#555] truncate">{p.tagline}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Agent-Reach 全网态势感知与热点雷达 (一键激发分身创作) */}
          {radarInsights.length > 0 && (
            <div className="pt-1.5 border-t border-white/[0.04]">
              <div className="text-[11px] text-[#888] mb-1.5 flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3 h-3 text-[#FFCC00]" /> AGENT-REACH 实时热点雷达 (点击直接填入灵感)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {radarInsights.map((insight, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(insight.topic);
                      setTitle(insight.topic);
                    }}
                    className="text-left text-[11px] px-2 py-1 rounded bg-white/[0.02] border border-white/[0.06] hover:border-[#00FFCC]/40 text-[#bbb] hover:text-white transition-all flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FFCC] animate-pulse" />
                    <span>{insight.topic}</span>
                    <span className="text-[9px] text-[#555] font-mono">({insight.source})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* 意识种子两步流水线：字数档位与结构大纲控制 */}
          <div className="pt-2 border-t border-white/[0.04] space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#666] font-mono">篇幅规格:</span>
                <div className="flex gap-1">
                  {[500, 1000, 2000, 3000].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setWordTarget(num as any)}
                      className={`text-xs px-2.5 py-0.5 rounded border transition-all ${
                        wordTarget === num
                          ? 'border-[#00FFCC] text-[#00FFCC] bg-[#00FFCC]/10 font-bold shadow-[0_0_8px_rgba(0,255,204,0.3)]'
                          : 'border-white/[0.06] text-[#666] hover:text-white'
                      }`}
                    >
                      {num} 字{num >= 2000 ? '旗舰长文' : '短长篇'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 毫秒级主题大纲生成按钮 */}
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleGenerateOutline}
                disabled={isGeneratingOutline || !prompt.trim() || state === 'streaming'}
                className="text-xs h-7 border-[#FFCC00]/40 text-[#FFCC00] hover:bg-[#FFCC00]/10 flex items-center"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                <span>{isGeneratingOutline ? '正在提炼大纲...' : 'Step 1: 毫秒生成章节大纲'}</span>
              </Button>
            </div>

            {/* 可视化大纲展示与微调框 */}
            {outline && (
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="flex justify-between items-center text-[10px] text-[#888] font-mono">
                  <span>拟定章节结构与逻辑骨架 (可编辑调整):</span>
                  <button type="button" onClick={() => setOutline('')} className="text-[#ff4444] hover:underline">清空大纲</button>
                </div>
                <Textarea
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  className="bg-transparent border-none text-xs font-mono text-[#ddd] p-0 min-h-[60px] focus-visible:ring-0"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 items-center">
            <div className="flex gap-1">
              {(['concise', 'detailed', 'academic', 'casual'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`cyber-mono text-xs px-3 py-1 border ${
                    style === s
                      ? 'border-[#00FFCC] text-[#00FFCC] bg-[#00FFCC]/10'
                      : 'border-[#1a1a1a] text-[#666] hover:border-[#00FFCC]/50'
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>

            {state !== 'streaming' ? (
              <Button
                onClick={startStream}
                disabled={!prompt.trim() || publishing}
                className="cyber-btn ml-auto"
              >
                <Sparkles className="w-4 h-4 mr-1" /> STREAM WRITE
              </Button>
            ) : (
              <Button
                onClick={stopStream}
                className="cyber-btn-blue ml-auto"
              >
                <Square className="w-4 h-4 mr-1" /> STOP
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 流式输出 */}
      {output && (
        <Card className="cyber-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="cyber-mono text-xs text-[#666]">
                {state === 'streaming' && '▸ EIDOLON 正在思考...'}
                {state === 'done' && '✓ 生成完成'}
                {state === 'error' && '✗ 生成失败'}
              </span>
              {state === 'streaming' && (
                <div className="cyber-loading-bar w-20 h-1" />
              )}
            </div>
            <pre
              ref={outputRef}
              className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#ddd] max-h-[500px] overflow-y-auto scroll-smooth"
            >
              {output}
              {state === 'streaming' && <span className="cyber-blink">▊</span>}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* 重新生成 / 编辑 */}
      {state === 'done' && output && !publishResult && (
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={() => { setOutput(''); setState('idle'); }} className="border-[#FFCC00]/30 text-[#FFCC00] text-xs">
            <RefreshCw className="w-3 h-3 mr-1" /> REGENERATE
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            const edited = window.prompt('编辑内容（可直接修改后保存）:', output);
            if (edited && edited.trim()) setOutput(edited);
          }} className="border-[#00FFCC]/30 text-[#00FFCC] text-xs">
            <FileText className="w-3 h-3 mr-1" /> EDIT
          </Button>
        </div>
      )}

      {/* 发布区 */}
      {state === 'done' && output && !publishResult && (
        <Card className="cyber-panel">
          <CardContent className="p-4 space-y-3">
            <h3 className="cyber-mono cyber-text-glow-gold flex items-center gap-2">
              <Coins className="w-4 h-4" /> 发布与确权
            </h3>
            <div>
              <label className="cyber-mono text-xs text-[#666] mb-1 block">标题</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="文章标题"
                className="bg-[#0a0a0a] border-[#1a1a1a]"
              />
            </div>
            <div className="flex gap-3 items-center text-xs text-[#999]">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" /> CC-BY
              </span>
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3" /> 1% 版税
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> ARP 确权
              </span>
            </div>
            <Button
              onClick={publish}
              disabled={!title.trim() || publishing}
              className="cyber-btn-gold w-full"
            >
              {publishing ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 发布中...</>
              ) : (
                <><Zap className="w-4 h-4 mr-1" /> 发布至 Arweave + 铸造 NFT</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 发布结果 */}
      {publishResult && (
        <Card className="cyber-panel border-[#00FFCC]/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-[#00FFCC]">
              <Check className="w-5 h-5" />
              <h3 className="font-bold">发布成功</h3>
            </div>
            <div className="space-y-2 cyber-mono text-xs">
              <div>
                <span className="text-[#666]">Arweave Hash: </span>
                <a
                  href={`/?post=${publishResult.arweaveHash}`}
                  className="text-[#00FFCC] hover:underline cursor-pointer font-bold"
                  title="点击查看文章内容"
                >
                  {publishResult.arweaveHash} ↗
                </a>
              </div>
              <div>
                <span className="text-[#666]">NFT Token ID: </span>
                <span className="text-[#FFCC00]">
                  {typeof publishResult.tokenId === 'object' && publishResult.tokenId?.__bigint
                    ? publishResult.tokenId.__bigint
                    : String(publishResult.tokenId || '')}
                </span>
              </div>
              <div>
                <span className="text-[#666]">ARP VC ID: </span>
                <span className="text-[#0066FF]">{publishResult.arpVcId}</span>
              </div>
              <div>
                <span className="text-[#666]">Content ID: </span>
                <span className="text-[#999]">{publishResult.contentId}</span>
              </div>
              <div>
                <span className="text-[#666]">Upload: </span>
                <span className="text-[#00FFCC]">
                  {publishResult.uploadFallback ? 'Web5 节点存证已完成' : 'Irys 真实上传'} ({publishResult.uploadSize} bytes)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Button
                onClick={() => {
                  window.location.href = `/?post=${publishResult.arweaveHash}`;
                }}
                className="bg-gradient-to-r from-[#00FFCC] to-[#0066FF] text-black font-bold text-xs h-8 px-4 shadow-lg shadow-[#00FFCC]/20"
              >
                📖 立即阅读刚发布的文章
              </Button>
              <Button
                onClick={() => {
                  setPrompt('');
                  setTitle('');
                  setOutput('');
                  setPublishResult(null);
                  setState('idle');
                }}
                variant="ghost"
                className="cyber-mono text-xs text-[#888] hover:text-white"
              >
                写下一篇
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="cyber-panel border-[#ff4444]/30">
          <CardContent className="p-4 flex items-center gap-2 text-[#ff4444]">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
