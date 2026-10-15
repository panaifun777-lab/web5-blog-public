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

type WriteState = 'idle' | 'streaming' | 'done' | 'error';

export function Writer({ session }: { session: VesselSession | null }) {
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState<'concise' | 'detailed' | 'academic' | 'casual'>('detailed');
  const [output, setOutput] = useState('');
  const [state, setState] = useState<WriteState>('idle');
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);

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

  const canWrite = session && session.accessMode === 'vessel';

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
          style: currentStyle,
          maxTokens: 800,
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
  }, [prompt, style, title]);

  const stopStream = () => {
    abortRef.current?.abort();
    setState('idle');
  };

  const publish = async () => {
    if (!output.trim() || !title.trim()) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch('/api/content/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.sessionToken ? { Authorization: `Bearer ${session.sessionToken}` } : {}),
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
            const edited = prompt('编辑内容:', output);
            if (edited) setOutput(edited);
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
                <span className="text-[#00FFCC]">{publishResult.arweaveHash}</span>
              </div>
              <div>
                <span className="text-[#666]">NFT Token ID: </span>
                <span className="text-[#FFCC00]">{publishResult.tokenId}</span>
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
                <span className={publishResult.uploadFallback ? 'text-[#FF66AA]' : 'text-[#00FFCC]'}>
                  {publishResult.uploadFallback ? '本地 fallback' : 'Irys 真实上传'} ({publishResult.uploadSize} bytes)
                </span>
              </div>
            </div>
            <Button
              onClick={() => {
                setPrompt('');
                setTitle('');
                setOutput('');
                setPublishResult(null);
                setState('idle');
              }}
              variant="ghost"
              className="cyber-mono text-xs"
            >
              写下一篇
            </Button>
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
