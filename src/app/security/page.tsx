// ════════════════════════════════════════════════════════════════
// src/app/security/page.tsx — 安全披露 / Security Disclosure
// 服务端组件 · 无客户端状态 · 与 security.txt 保持事实一致
// ════════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Bug,
  ExternalLink,
  ArrowLeft,
  Clock,
  Users,
  FileText,
  Mail,
} from 'lucide-react';

const GITHUB_ADVISORY =
  'https://github.com/panaifun777-lab/web5-blog-public/security/advisories/new';
const X_DM = 'https://x.com/PiaoshuAgent';

export const metadata: Metadata = {
  title: { absolute: '安全披露 Security Disclosure | Web5.blog' },
  description:
    'Web5.blog 负责任披露政策：如何通过 GitHub 私密漏洞报告或 X 私信报告安全问题、测试范围与不在范围、研究规则、响应时限、致谢名单与安全港声明。',
  alternates: { canonical: '/security' },
  openGraph: {
    title: '安全披露 Security Disclosure | Web5.blog',
    description:
      '善意研究，负责任地报告 — Web5.blog 漏洞披露渠道、范围、规则与响应承诺。',
    url: 'https://web5.blog/security',
    siteName: 'Web5.blog',
    type: 'website',
    locale: 'zh_CN',
  },
};

const CHANNELS = [
  {
    label: '主渠道 · GitHub 私密漏洞报告',
    value: 'github.com/panaifun777-lab/web5-blog-public',
    href: GITHUB_ADVISORY,
    note: '优先使用。私密 Advisory 可与我们直接讨论复现步骤与修复方案。',
  },
  {
    label: '备用渠道 · X 私信',
    value: '@PiaoshuAgent',
    href: X_DM,
    note: 'GitHub 不可用时使用。请先私信说明来意，不要在公开时间线披露细节。',
  },
  {
    label: '机器可读入口',
    value: '/.well-known/security.txt',
    href: '/.well-known/security.txt',
    note: '符合 RFC 9116，供自动化工具与安全研究者读取联系方式与政策地址。',
  },
];

const IN_SCOPE = [
  {
    name: 'web5.blog 主站与 /api/* 接口',
    desc: '页面渲染、鉴权与会话、内容发布、支付与结算相关接口的访问控制、注入、越权与敏感信息泄露问题。',
  },
  {
    name: 'contracts/ 下的 Arc 合约',
    desc: '仓库 contracts/ 目录中的合约逻辑、权限边界与资金路径缺陷。',
  },
  {
    name: '公开的托管与结算流程（仅限测试网）',
    desc: '面向公众开放的托管、分账与结算流程，仅接受测试网环境下的验证。',
  },
];

const OUT_OF_SCOPE = [
  '第三方服务与基础设施（Circle、Google、Cloudflare、Irys 等）自身的漏洞，请直接报告给对应厂商。',
  '拒绝服务（DoS/DDoS）与压力测试、资源耗尽型测试。',
  '社会工程、钓鱼演练、尾随与物理攻击。',
  '自动化扫描器产生的噪音报告（无实际影响证明的告警、指纹识别结果、缺失的“最佳实践”响应头等）。',
  '测试网假币或 demo 数据层面的“资金损失”。',
  '已在公开仓库、公开 issue 或公开 Advisory 中披露的问题。',
];

const RULES = [
  '不得读取、修改、删除或外传他人的数据；验证越权时仅使用你自己的账号与数据。',
  '不得使用真实资金进行测试；所有资金路径验证只在测试网进行。',
  '只做证明问题存在所需的最小验证，一旦确认立即停止，不扩大影响面。',
  '给我们合理的修复时间：目标 90 天内完成修复，复杂问题可协商延长，修复前不公开细节。',
];

const RESPONSES = [
  {
    window: '3 个工作日',
    title: '确认收到',
    desc: '人工回复确认我们已收到报告，并给出后续沟通方式。',
  },
  {
    window: '7 个工作日',
    title: '初步判断',
    desc: '给出初步定级与是否在范围内的判断，必要时同步复现进度。',
  },
  {
    window: '优先处理',
    title: '严重问题',
    desc: '涉及资金、私钥或大规模数据的问题优先修复，并持续同步进展。',
  },
];

const NAV = [
  { href: '#channels', label: '报告渠道' },
  { href: '#scope', label: '范围' },
  { href: '#rules', label: '研究规则' },
  { href: '#response', label: '响应时限' },
  { href: '#rewards', label: '奖励' },
  { href: '#hall-of-fame', label: 'Hall of Fame' },
  { href: '#safe-harbor', label: '安全港' },
];

function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-xs font-mono text-[#00FFCC] tracking-[0.3em]">
        {index} / {title}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-[#00FFCC]/30 to-transparent" />
    </div>
  );
}

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[#050508] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,204,0.015),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Back */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#555] hover:text-[#00FFCC] text-sm transition-colors font-mono"
          >
            <ArrowLeft className="w-4 h-4" /> 返回 W · B · O · G
          </Link>
          <span className="text-[10px] font-mono text-[#444] tracking-[0.2em]">
            RFC 9116
          </span>
        </div>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00FFCC] to-[#0066FF] flex items-center justify-center shadow-lg shadow-[#00FFCC]/20">
              <Shield className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: '#00FFCC', textShadow: '0 0 20px rgba(0,255,204,0.2)' }}
              >
                安全披露
              </h1>
              <div className="text-sm text-[#666] mt-1 font-mono">
                Security Disclosure · 善意研究，负责任地报告
              </div>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-[#00FFCC]/30 via-[#0066FF]/30 to-transparent" />
        </div>

        {/* Intro + in-page nav */}
        <div className="p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] mb-12">
          <p className="text-sm text-[#bbb] leading-relaxed mb-4">
            Web5.blog 由一个小团队维护。我们欢迎安全研究者在不伤害用户与数据的前提下，
            帮助我们发现并修复问题。本页面说明报告渠道、测试范围、研究规则、响应时限与致谢方式，
            与{' '}
            <a
              href="/.well-known/security.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00FFCC] hover:text-[#00CC99] transition-colors underline decoration-[#00FFCC]/30 underline-offset-2"
            >
              /.well-known/security.txt
            </a>{' '}
            中的信息保持一致。
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-mono">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[#666] hover:text-[#00CC99] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 01 — CHANNELS */}
        <section id="channels" className="mb-16 scroll-mt-8">
          <SectionLabel index="01" title="REPORT" />

          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" style={{ color: '#00FFCC' }} />
            报告渠道
          </h2>

          <div className="space-y-3">
            {CHANNELS.map((channel) => {
              return (
                <a
                  key={channel.label}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#00FFCC]/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{channel.label}</div>
                      <div className="text-xs font-mono text-[#00FFCC] mt-1 break-all">
                        {channel.value}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#555] flex-shrink-0 mt-1" />
                  </div>
                  <p className="text-xs text-[#777] mt-2 leading-relaxed">{channel.note}</p>
                </a>
              );
            })}
          </div>

          <div className="mt-4 p-4 rounded-xl border border-[#FF66AA]/20 bg-[#FF66AA]/[0.03]">
            <div className="text-xs font-mono text-[#FF66AA] mb-1 tracking-widest">
              {'// DO_NOT_DISCLOSE_IN_PUBLIC'}
            </div>
            <p className="text-sm text-[#bbb] leading-relaxed">
              请勿在公开 issue、PR、社交媒体或群里披露未修复漏洞。
              在修复发布之前，任何公开细节都可能放大风险；我们会在修复后与你商定公开方式与时间。
            </p>
          </div>
        </section>

        {/* 02 — SCOPE */}
        <section id="scope" className="mb-16 scroll-mt-8">
          <SectionLabel index="02" title="SCOPE" />

          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Bug className="w-5 h-5" style={{ color: '#00FFCC' }} />
            范围（Scope）
          </h2>

          <div className="space-y-3">
            {IN_SCOPE.map((item) => (
              <div
                key={item.name}
                className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                style={{ borderLeft: '3px solid rgba(0,255,204,0.5)' }}
              >
                <div className="text-sm font-medium text-white font-mono break-all">
                  {item.name}
                </div>
                <p className="text-xs text-[#888] mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#777] mt-4 leading-relaxed">
            所有测试仅限你自己的账号与数据。请勿触碰、遍历或导出其他用户、创作者与分身的任何内容。
            链上部分只接受测试网验证；主网仅允许只读观察。
          </p>
        </section>

        {/* 03 — OUT OF SCOPE */}
        <section className="mb-16">
          <SectionLabel index="03" title="OUT_OF_SCOPE" />

          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: '#FF66AA' }} />
            不在范围（Out of Scope）
          </h2>

          <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <ul className="space-y-2.5">
              {OUT_OF_SCOPE.map((item) => (
                <li key={item} className="flex gap-3 text-xs text-[#888] leading-relaxed">
                  <span className="text-[#FF66AA]/70 font-mono flex-shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 04 — RULES */}
        <section id="rules" className="mb-16 scroll-mt-8">
          <SectionLabel index="04" title="RULES" />

          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#00FFCC' }} />
            研究规则
          </h2>

          <div className="space-y-3">
            {RULES.map((rule, i) => (
              <div
                key={rule}
                className="flex gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]"
              >
                <span className="font-mono font-bold text-xs text-[#00FFCC] flex-shrink-0 pt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-xs text-[#aaa] leading-relaxed">{rule}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 05 — RESPONSE */}
        <section id="response" className="mb-16 scroll-mt-8">
          <SectionLabel index="05" title="RESPONSE" />

          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: '#00FFCC' }} />
            响应时限
          </h2>
          <p className="text-xs text-[#777] mb-4 leading-relaxed">
            这是小团队的诚实承诺：没有 24/7 安全值班，但我们会在下面这些时间窗口内处理。
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            {RESPONSES.map((item) => (
              <div
                key={item.title}
                className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]"
              >
                <div className="text-sm font-bold text-[#00FFCC] font-mono">{item.window}</div>
                <div className="text-sm font-medium text-white mt-1">{item.title}</div>
                <p className="text-[11px] text-[#777] mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 06 — REWARDS */}
        <section id="rewards" className="mb-16 scroll-mt-8">
          <SectionLabel index="06" title="REWARDS" />

          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: '#00FFCC' }} />
            奖励
          </h2>

          <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <p className="text-sm text-[#bbb] leading-relaxed">
              目前为致谢制（Hall of Fame），暂无现金奖励计划。有效报告会在征得你同意后署名致谢；
              如你希望匿名，我们只记录问题类型与修复版本，不公开任何身份信息。
            </p>
            <p className="text-xs text-[#777] mt-3 leading-relaxed">
              我们不承诺任何形式的报酬，也不会因为报告本身主张对你的任何权利。
            </p>
          </div>
        </section>

        {/* 07 — HALL OF FAME */}
        <section id="hall-of-fame" className="mb-16 scroll-mt-8">
          <SectionLabel index="07" title="HALL_OF_FAME" />

          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: '#FFCC00' }} />
            Hall of Fame
          </h2>

          <div className="p-8 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center">
            <Shield className="w-8 h-8 mx-auto text-[#333] mb-3" />
            <p className="text-sm text-[#777] leading-relaxed">
              尚无公开致谢。第一份经确认的有效报告将列在这里。
            </p>
          </div>
        </section>

        {/* 08 — SAFE HARBOR */}
        <section id="safe-harbor" className="mb-16 scroll-mt-8">
          <SectionLabel index="08" title="SAFE_HARBOR" />

          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#00FFCC' }} />
            安全港（Safe Harbor）
          </h2>

          <div className="p-5 rounded-xl border border-[#00FFCC]/20 bg-[#00FFCC]/[0.03]">
            <p className="text-sm text-[#bbb] leading-relaxed">
              对遵守本政策、善意研究且未造成数据损害的行为，我们不主动采取法律行动
              （在法律允许范围内）。前提是：仅测试你自己的账号与数据、不触碰真实资金、
              在测试网验证资金路径、发现问题后立即停止并第一时间联系我们。
            </p>
            <p className="text-xs text-[#777] mt-3 leading-relaxed">
              若你不确定某项测试是否被允许，请先通过上面的渠道询问，我们会明确答复。
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="pt-4 pb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent mb-6" />

          <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="text-[10px] font-mono text-[#555] mb-3 tracking-widest">
              {'// MACHINE_READABLE_ENTRYPOINTS'}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/.well-known/security.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-[#00FFCC] hover:text-[#00CC99] transition-colors"
              >
                /.well-known/security.txt
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={GITHUB_ADVISORY}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-[#00FFCC] hover:text-[#00CC99] transition-colors"
              >
                GitHub 私密漏洞报告
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] font-mono text-[#444]">
            Web5.blog Security Policy · 与 security.txt 同步维护
          </div>
        </div>
      </div>
    </main>
  );
}
