// ════════════════════════════════════════════════════════════════
// src/lib/web5/alerts/alerter.ts
// 仪表盘告警系统 — BudgetFence 拦截 / 异常行为通知
// ════════════════════════════════════════════════════════════════

import { db } from '@/lib/db';

export interface Alert {
  id: string;
  vesselId: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
}

/**
 * 创建一条系统告警
 */
export async function createAlert(
  vesselId: string,
  severity: 'info' | 'warning' | 'critical',
  title: string,
  message: string,
  actionUrl?: string,
): Promise<void> {
  await db.autonomousLog.create({
    data: {
      vesselId,
      action: 'alert',
      metadata: JSON.stringify({ type: 'alert', severity, title, message, actionUrl, read: false }),
    },
  });
}

/**
 * 查询 Vessel 的活跃告警
 */
export async function getAlerts(vesselDid: string): Promise<{ alerts: Alert[]; unreadCount: number }> {
  const vessel = await db.vessel.findUnique({ where: { did: vesselDid } });
  if (!vessel) return { alerts: [], unreadCount: 0 };

  const logs = await db.autonomousLog.findMany({
    where: { vesselId: vessel.id, action: 'alert' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const alerts: Alert[] = logs.map(log => {
    const meta = JSON.parse(log.metadata || '{}');
    return {
      id: log.id,
      vesselId: vessel.id,
      severity: meta.severity || 'info',
      title: meta.title || 'System Alert',
      message: meta.message || '',
      actionUrl: meta.actionUrl,
      read: meta.read === true,
      createdAt: log.createdAt,
    };
  });

  return { alerts, unreadCount: alerts.filter(a => !a.read).length };
}

/**
 * 标记告警已读
 */
export async function markAlertRead(alertId: string): Promise<void> {
  const log = await db.autonomousLog.findUnique({ where: { id: alertId } });
  if (!log) return;
  const meta = JSON.parse(log.metadata || '{}');
  meta.read = true;
  await db.autonomousLog.update({ where: { id: alertId }, data: { metadata: JSON.stringify(meta) } });
}
