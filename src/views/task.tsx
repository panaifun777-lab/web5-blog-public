// ════════════════════════════════════════════════════════════════
// src/views/task.tsx
// /task/<orderId> — 单个 AP2 悬赏任务的可索引详情页（服务端渲染）
//
// Renders only what `TASK_PUBLIC_SELECT` allows out of the database, so a
// deliverable body, an acceptance hash or a dispute reason can never appear
// here. Every string comes from the typed catalog for the locale the URL
// carries, exactly like the article view.
// ════════════════════════════════════════════════════════════════

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/web5/footer';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Coins,
  ExternalLink,
  FileText,
  Shield,
  Clock,
  User,
} from 'lucide-react';
import { createT } from '@/lib/i18n/translate';
import { DEFAULT_LOCALE, type LocaleCode } from '@/lib/i18n/config';
import { localizePath } from '@/lib/i18n/routing';
import { SITE_URL } from '@/lib/i18n/metadata';
import { LanguageSwitcher } from '@/components/web5/i18n/language-switcher';
import type { PublicTaskOrder } from '@/lib/web5/ap2/task-browse';
import {
  arweaveGatewayUrl,
  explorerTxUrl,
  getPublicTaskOrder,
  listOpenTaskOrders,
  taskStatusLabel,
  taskStructuredData,
  taskPath,
} from '@/lib/web5/ap2/task-browse';

export interface TaskViewProps {
  orderId: string;
  locale?: LocaleCode;
}

/** `label + optional explorer/archives link` row of the evidence grid. */
function EvidenceRow({
  label,
  value,
  href,
  accent = 'text-[#00FFCC]',
}: {
  label: string;
  value: string | null;
  href?: string | null;
  accent?: string;
}) {
  return (
    <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04] space-y-1">
      <div className="text-[#666] text-[10px]">{label}</div>
      {value ? (
        href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-mono text-[11px] break-all hover:underline ${accent}`}
          >
            {value.slice(0, 16)}…{value.slice(-8)} ↗
          </a>
        ) : (
          <div className="font-mono text-[11px] text-[#aaa] break-all">{value}</div>
        )
      ) : (
        <div className="font-mono text-[11px] text-[#555]">—</div>
      )}
    </div>
  );
}

export default async function TaskPage({ orderId, locale = DEFAULT_LOCALE }: TaskViewProps) {
  const t = createT(locale);
  const task = await getPublicTaskOrder(orderId);

  if (!task) {
    // Unknown orderId, a demo `ap2-task-seed-*` / `ap2-task-meme-*` row or a
    // malformed id: there is nothing to index and nothing to show.
    notFound();
  }

  const open = await listOpenTaskOrders(8).catch(() => [] as PublicTaskOrder[]);
  const siblings = open.filter((item) => item.orderId !== task.orderId).slice(0, 6);

  const status = taskStatusLabel(task.status, locale);
  const jsonLd = taskStructuredData({ task, related: siblings, locale });
  const escrowUrl = explorerTxUrl(task.escrowTxHash);
  const payoutUrl = explorerTxUrl(task.payoutTxHash);
  const feeUrl = explorerTxUrl(task.feeTxHash);
  const refundUrl = explorerTxUrl(task.refundTxHash);
  const gatewayUrl = arweaveGatewayUrl(task.deliverableArweaveHash);

  const statusTone = task.isOpen
    ? 'bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/30'
    : task.status === 'SETTLED'
      ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
      : 'bg-[#FFCC00]/15 text-[#FFCC00] border-[#FFCC00]/30';

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col selection:bg-[#00FFCC] selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-white/[0.06] bg-[#050508]/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={localizePath('/', locale)}
              className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#00FFCC] transition-colors font-mono py-1 px-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('task.backHome')}</span>
            </Link>
            <span className="text-[10px] text-[#666] font-mono hidden sm:inline">
              {t('task.eyebrow')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Badge className={`${statusTone} font-mono text-[10px]`}>{status}</Badge>
            <Badge className="bg-[#B080E8]/15 text-[#B080E8] border-[#B080E8]/30 font-mono text-[10px]">
              ARC-{task.chainId}
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[860px] mx-auto w-full px-4 sm:px-6 py-10 sm:py-16">
        <div className="space-y-4 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 text-[11px] text-[#666] font-mono">
            <Coins className="w-3.5 h-3.5 text-[#FFCC00]" />
            <span>{t('task.bountyLabel')}</span>
            <span className="text-[#FFCC00] font-bold text-sm">{task.bountyDisplay} USDC</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
            {task.title}
          </h1>

          <div className="flex items-center justify-between gap-4 pt-2 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <User className="w-4 h-4 text-[#00FFCC] flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] text-[#888]">{t('task.creatorLabel')}</div>
                <div className="text-[11px] text-[#ccc] font-mono truncate max-w-xs sm:max-w-md">
                  {task.creatorDid}
                </div>
              </div>
            </div>
            <div className="text-right text-[11px] text-[#888] font-mono flex-shrink-0">
              <div className="flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-[#555]" />
                <span>{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="text-[#555] text-[10px] mt-0.5">{t('task.createdLabel')}</div>
            </div>
          </div>

          {task.assignedAgentDid ? (
            <div className="flex items-center gap-2 text-[11px] pt-1">
              <Bot className="w-3.5 h-3.5 text-[#B080E8]" />
              <span className="text-[#888]">{t('task.agentLabel')}</span>
              <span className="font-mono text-[#B080E8] truncate max-w-[260px]">
                {task.assignedAgentDid}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] pt-1 text-[#666]">
              <Bot className="w-3.5 h-3.5" />
              <span>{t('task.unassigned')}</span>
            </div>
          )}
        </div>

        <section className="py-8">
          <h2 className="text-xs font-bold text-[#888] uppercase tracking-wider mb-3">
            {t('task.descriptionLabel')}
          </h2>
          <div className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-[#ccc]">
            {task.description || t('task.descriptionEmpty')}
          </div>
        </section>

        <section className="my-8 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs font-mono">
          <div className="text-[#888] font-bold text-xs flex items-center justify-between border-b border-white/[0.04] pb-2">
            <span className="flex items-center gap-1.5 text-white">
              <Shield className="w-3.5 h-3.5 text-[#00FFCC]" />
              {t('task.evidenceTitle')}
            </span>
            <span className={task.isOpen ? 'text-[#00FFCC]' : 'text-[#777]'}>{status}</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 pt-1">
            <EvidenceRow
              label={t('task.escrowTx')}
              value={task.escrowTxHash}
              href={escrowUrl}
            />
            <EvidenceRow
              label={t('task.payoutTx')}
              value={task.payoutTxHash}
              href={payoutUrl}
              accent="text-[#10B981]"
            />
            <EvidenceRow label={t('task.feeTx')} value={task.feeTxHash} href={feeUrl} accent="text-[#B080E8]" />
            <EvidenceRow label={t('task.refundTx')} value={task.refundTxHash} href={refundUrl} accent="text-[#FFCC00]" />
          </div>

          <div className="pt-2 border-t border-white/[0.04]">
            {task.deliverableArweaveHash ? (
              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                <span className="text-[#888] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#00FFCC]" />
                  {t('task.deliverableLabel')}
                </span>
                <a
                  href={gatewayUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00FFCC] hover:underline flex items-center gap-1"
                  title={t('task.gatewayTitle')}
                >
                  <span>{task.deliverableArweaveHash.slice(0, 16)}…{task.deliverableArweaveHash.slice(-8)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="text-[11px] text-[#666]">{t('task.noDeliverable')}</div>
            )}
          </div>

          {!task.escrowTxHash && (
            <div className="text-[10px] text-[#666] pt-1">{t('task.noEscrow')}</div>
          )}
        </section>

        <section className="my-8 p-5 rounded-2xl bg-gradient-to-br from-[#FFCC00]/10 via-[#050508] to-[#00FFCC]/5 border border-[#FFCC00]/30 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FFCC00]" />
            <span className="font-bold text-sm text-white">{t('task.splitTitle')}</span>
          </div>
          <p className="text-xs text-[#aaa] leading-relaxed">{t('task.splitBody')}</p>
          <p className="text-[10px] text-[#888] font-mono leading-relaxed">{t('task.settlementNote')}</p>
        </section>

        <section className="mt-10 space-y-3 pt-6 border-t border-white/[0.08]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#00FFCC]" />
              <span>{t('task.relatedTitle')}</span>
            </h2>
            <span className="text-[10px] text-[#666] font-mono">{t('task.relatedNote')}</span>
          </div>

          {siblings.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-center text-[11px] text-[#666]">
              {t('task.relatedEmpty')}
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-2.5">
              {siblings.map((item) => (
                <li key={item.orderId}>
                  <Link
                    href={localizePath(taskPath(item.orderId), locale)}
                    className="block p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#00FFCC]/40 transition-colors"
                  >
                    <div className="text-sm text-white font-semibold line-clamp-1">{item.title}</div>
                    <div className="flex items-center justify-between gap-2 mt-1 text-[10px] font-mono">
                      <span className="text-[#FFCC00]">{item.bountyDisplay} USDC</span>
                      <span className="text-[#888]">{taskStatusLabel(item.status, locale)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="text-[11px] text-[#666] font-mono pt-2">
            <span>{t('task.apiHint')}</span>{' '}
            <a href={`${SITE_URL}/api/commerce/tasks`} className="text-[#00FFCC] hover:underline">
              /api/commerce/tasks ↗
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
