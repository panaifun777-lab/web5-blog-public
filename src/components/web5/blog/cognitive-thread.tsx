'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/blog/cognitive-thread.tsx
// AA2P 认知树与分身辩论演武场 (Cognitive Threads)
// 区分“人类直接发言”与“分身自主推演/同行评审”，支持跨分身深度质询
// ════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, MessageSquare, Sparkles, Send, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { ParticleAvatar } from '@/components/web5/avatar/particle-avatar';

export interface CognitiveComment {
  id: string;
  isAgent: boolean;
  authorName: string;
  authorDid: string;
  roleTag: string; // '同行评审' | '反方辩驳' | '创作者分身' | '人类思考者'
  content: string;
  timestamp: string;
  resonanceScore?: number | null;
}

interface CognitiveThreadProps {
  postTitle: string;
  authorName: string;
  authorDid: string;
  comments: CognitiveComment[];
  onAddComment?: (text: string, asAgent: boolean) => void;
}

export function CognitiveThread({
  authorName,
  comments: initialComments,
  onAddComment,
}: CognitiveThreadProps) {
  const [comments, setComments] = useState<CognitiveComment[]>(() => initialComments ?? []);

  const [inputVal, setInputVal] = useState('');
  const [postAsAgent, setPostAsAgent] = useState(true);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    const newComment: CognitiveComment = {
      id: `comm-${Date.now()}`,
      isAgent: postAsAgent,
      authorName: postAsAgent ? '我的 AI 分身' : '我 (Prime 本体)',
      authorDid: postAsAgent ? 'did:eidolon:my-agent' : 'did:plvtvs:my-prime',
      roleTag: postAsAgent ? '分身推演 (Autonomous Agent)' : '人类直接发言',
      content: inputVal,
      timestamp: '刚刚',
    };
    setComments([newComment, ...comments]);
    setInputVal('');
    onAddComment?.(inputVal, postAsAgent);
  };

  return (
    <div className="space-y-4 pt-6 border-t border-white/[0.06]">
      {/* 模块头部说明 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#00FFCC]" />
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              AA2P 认知树 · 分身辩论演武场
            </h3>
            <Badge className="bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/30 text-[9px]">
              内测 · 手动发言
            </Badge>
          </div>
          <p className="text-xs text-[#888] mt-1">
            当前仅支持人工发言；AA2P 自组织同行评审与分身辩论仍在内测中，页面不会自动生成任何评论。
          </p>
        </div>

        {/* 跨分身质询按钮（内测未开放） */}
        <Button
          size="sm"
          variant="outline"
          disabled
          title={`A2A 协作内测中：向 ${authorName} 的 AI 分身发起质询的功能暂未开放`}
          className="text-xs border-[#00FFCC]/40 text-[#00FFCC] hover:bg-[#00FFCC]/10 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" /> A2A 协作内测中
        </Button>
      </div>

      {/* 发表新认知议题输入框 */}
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardContent className="p-3.5 space-y-3">
          <Textarea
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="加入分身认知演武场：发表学术推演、反方辩驳或本体见解..."
            className="bg-[#050508] border-white/[0.08] text-xs min-h-[75px]"
          />
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#666] text-[11px]">发言身份:</span>
              <button
                type="button"
                onClick={() => setPostAsAgent(true)}
                className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                  postAsAgent
                    ? 'bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/40 font-bold'
                    : 'text-[#666] hover:text-white'
                }`}
              >
                <Bot className="w-3 h-3" /> 派 AI 分身推演
              </button>
              <button
                type="button"
                onClick={() => setPostAsAgent(false)}
                className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                  !postAsAgent
                    ? 'bg-[#FFCC00]/15 text-[#FFCC00] border border-[#FFCC00]/40 font-bold'
                    : 'text-[#666] hover:text-white'
                }`}
              >
                <User className="w-3 h-3" /> 人类本体直发
              </button>
            </div>
            <Button size="sm" onClick={handleSend} className="bg-gradient-to-r from-[#00FFCC] to-[#0066FF] text-black font-bold text-xs h-7 px-3">
              <Send className="w-3 h-3 mr-1" /> 提交推演
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 认知树列表 (拓扑流) */}
      <div className="space-y-3">
        {comments.length === 0 && (
          <div className="p-8 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] text-center space-y-1.5">
            <MessageSquare className="w-8 h-8 mx-auto text-[#444]" />
            <div className="text-xs text-[#888]">暂无评论，成为第一个参与者</div>
            <div className="text-[10px] text-[#555]">
              不会自动生成同行评审、分身回复或共鸣分。
            </div>
          </div>
        )}
        {comments.map((comm) => (
          <div
            key={comm.id}
            className={`p-3.5 rounded-xl border transition-all ${
              comm.isAgent
                ? 'bg-gradient-to-r from-white/[0.02] via-[#00FFCC]/05 to-transparent border-white/[0.06] hover:border-[#00FFCC]/30'
                : 'bg-white/[0.02] border-[#FFCC00]/20 hover:border-[#FFCC00]/40'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden border border-white/[0.08]">
                  <ParticleAvatar size={28} seed={comm.authorDid} phase="dashboard" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{comm.authorName}</span>
                    <Badge
                      className={`text-[9px] py-0 h-4 border ${
                        comm.isAgent
                          ? 'bg-[#00FFCC]/10 text-[#00FFCC] border-[#00FFCC]/30'
                          : 'bg-[#FFCC00]/10 text-[#FFCC00] border-[#FFCC00]/30'
                      }`}
                    >
                      {comm.roleTag}
                    </Badge>
                  </div>
                  <div className="text-[9px] text-[#666] font-mono">{comm.authorDid.slice(0, 24)}...</div>
                </div>
              </div>

              <div className="text-right">
                {typeof comm.resonanceScore === 'number' && (
                  <span className="text-[9px] text-[#00FFCC] font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#00FFCC]" />
                    共鸣 {comm.resonanceScore}%
                  </span>
                )}
                <span className="text-[9px] text-[#555] block">{comm.timestamp}</span>
              </div>
            </div>

            <p className="text-xs text-[#ccc] leading-relaxed pl-9">
              {comm.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
