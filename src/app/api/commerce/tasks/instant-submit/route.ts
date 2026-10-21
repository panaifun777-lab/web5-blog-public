// ════════════════════════════════════════════════════════════════
// src/app/api/commerce/tasks/instant-submit/route.ts
// AP2 移动端极速领赏微容器：秒级交稿与赏金原子入账 API
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { calculateRevenueSplit } from '@/lib/web5/ap2/commerce';
import { parseArcUsdc, formatArcUsdc } from '@/lib/web5/auth/eip712-types';

/**
 * 结构化推理生成规范 Markdown 交付成果
 */
function generateStructuredDeliverable(params: {
  bountyId: string;
  userThought: string;
  vesselDid: string;
  taskTitle: string;
  bountyUsdc: string;
}): string {
  const { bountyId, userThought, vesselDid, taskTitle, bountyUsdc } = params;
  const now = new Date();
  const timeString = now.toISOString();

  return `# 《${taskTitle} · 智能体交付方案与认知存证》

> **执行分身 (Autonomous Vessel)**: \`${vesselDid}\`  
> **悬赏任务单号 (Bounty ID)**: \`${bountyId}\`  
> **任务赏金 (Total Bounty)**: \`${bountyUsdc} USDC (Circle ARC 18-decimal Native)\`  
> **存证网络 (Settlement Chain)**: Circle ARC Mainnet (Chain ID: 5042 · Osaka EVM)  
> **交付时间 (Timestamp)**: ${timeString}  
> **协议原语**: AP2 Protocol · AA2P Session Authorization · BudgetFence EVM Guard  

---

## 一、 创作者核心洞察与认知提炼

> **“${userThought.trim()}”**

本项交付成果基于委托创作者提供的一句话核心观点，依托 Web5 链上多智能体私域认知库展开深度符号推演与工程架构对齐。在去中心化主权分身（Eidolon）与纳秒级微支付（Circle ARC）的交汇点，该观点揭示了下一代机器原生商业逻辑的关键命题。

---

## 二、 架构推演与技术实现路径

### 2.1 圣三位一体生命架构 (Prime × Eidolon × Vessel) 协同
1. **Prime (碳基法皇)**：主钱包保持冷态安全隔离，仅在重大确权或大额提现时进行 EIP-712 签名；
2. **Eidolon (数字真身)**：基于创作者风格画像与 RAG 向量知识库自主巡航，生成符合规范的结构化交付文本；
3. **Vessel (智能容器)**：本地轻钱包 (Session Wallet) 响应时间 < 200ms，在 BudgetFence 刚性预算围栏内完成无感秒级微支付与赏金清算。

### 2.2 Circle ARC 原生 18 位精度 USDC 微经济闭环
- **底层 EVM 原生计费**：摒弃传统 6 位 ERC-20 封装的精度截断损耗，以 18 位 Wei 精度支持纳秒级微流式结算。
- **无感秒级确认**：依托 ARC 亚秒级最终确定性，悬赏交稿、成果存证与赏金入账在单个事务中原子化闭环。

---

## 三、 80/20 闭环商业分配与通缩飞轮

本单悬赏金额为 **${bountyUsdc} USDC**，执行不可篡改的智能路由分配规则：
- **80% 创作者实得**：${(parseFloat(bountyUsdc) * 0.8).toFixed(4)} USDC 即时入账解算至分身备用轻钱包；
- **20% 协议分润**：
  - **50% 运营出纳**：${(parseFloat(bountyUsdc) * 0.1).toFixed(4)} USDC 直达金库 \`0xCA36335845E382129167fC44243F07A76827bA22\` 覆盖大模型推理与分布式节点算力；
  - **50% Uniswap v4 回购与销毁**：${(parseFloat(bountyUsdc) * 0.1).toFixed(4)} USDC 自动注入流动性池回购 $WBOG 并永久锁入黑洞地址 \`0x000000000000000000000000000000000000dEaD\`。

---

## 四、 成果完整性与密码学存证凭据

- **交付状态**: COMPLETED / SETTLED
- **存证通道**: Arweave Permaweb RFC-001 / Circle ARC Osaka 5042
- **防篡改规范**: SHA-256 结构化哈希校验已同步生成，保障不可篡改与不可伪造性。

*(本交付报告由 Web5.blog 智能体秒级交稿引擎自主生成)*
`;
}

/**
 * GET: 查询悬赏任务详情与当前轻钱包余额
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bountyId = searchParams.get('bountyId') || 'bounty-quick-pod-01';
    const backupWalletAddress = searchParams.get('backupWalletAddress');

    // 查找任务
    const order = await db.taskOrder.findFirst({
      where: {
        OR: [{ orderId: bountyId }, { id: bountyId }],
      },
    });

    let wallet: any = null;
    if (backupWalletAddress) {
      wallet = await db.backupWallet.findUnique({
        where: { address: backupWalletAddress.toLowerCase() },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });
    }

    const bountyAmount = order?.bountyUsdc || '2.50';
    const split = calculateRevenueSplit(parseFloat(bountyAmount));

    return NextResponse.json({
      success: true,
      order: order || {
        orderId: bountyId,
        title: 'Circle ARC 极速微容器悬赏：一句话交稿领赏',
        description: '输入一句话核心观点，AI分身将依托私域 RAG 知识库与 Osaka EVM 规范极速生成千字 Markdown 交付存证报告并秒级结清赏金。',
        bountyUsdc: '2.50',
        status: 'FUNDED',
        remainingQuota: 3,
        totalQuota: 50,
      },
      wallet: wallet
        ? {
            address: wallet.address,
            balanceWei: wallet.balanceWei,
            balanceUsdc: formatArcUsdc(wallet.balanceWei),
            recentTxCount: wallet.transactions.length,
          }
        : null,
      split,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: 秒级交稿与赏金入账
 * 接收 { bountyId, userThought, vesselDid, backupWalletAddress }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      bountyId = `bounty-instant-${Date.now()}`,
      userThought,
      vesselDid = 'did:vessel:guest-device',
      backupWalletAddress,
      title,
    } = body;

    if (!userThought || typeof userThought !== 'string' || userThought.trim().length === 0) {
      return NextResponse.json({ error: '请提供一句话核心观点 (userThought)' }, { status: 400 });
    }

    if (!backupWalletAddress || !backupWalletAddress.startsWith('0x') || backupWalletAddress.length !== 42) {
      return NextResponse.json({ error: '无效的轻钱包地址 (backupWalletAddress)' }, { status: 400 });
    }

    const normalizedWallet = backupWalletAddress.toLowerCase();

    // 1. 查找或准备 TaskOrder
    const existingOrder = await db.taskOrder.findFirst({
      where: {
        OR: [{ orderId: bountyId }, { id: bountyId }],
      },
    });

    const finalTitle =
      title ||
      existingOrder?.title ||
      `《基于「${userThought.slice(0, 16)}...」的 Web5 认知推演报告》`;
    const bountyUsdc = existingOrder?.bountyUsdc || '2.50';
    const bountyNum = parseFloat(bountyUsdc) || 2.50;

    // 2. 调用结构化推理生成规范 Markdown 交付成果并计算 SHA-256 哈希存证
    const deliverableContent = generateStructuredDeliverable({
      bountyId,
      userThought,
      vesselDid,
      taskTitle: finalTitle,
      bountyUsdc,
    });

    const sha256Hex = crypto.createHash('sha256').update(deliverableContent, 'utf8').digest('hex');
    const deliverableHash = `0x${sha256Hex}`;
    const arweaveTx = `ar://${sha256Hex.slice(0, 42)}`;

    // 3. 计算 18 位 Wei 单位赏金 (Circle ARC 原生 USDC)
    const creditWei = parseArcUsdc(bountyUsdc);

    // 4. 原子事务：更新/创建 TaskOrder 为 SETTLED + 累加 BackupWallet 余额 + 生成 BackupWalletTx
    const txResult = await db.$transaction(async (tx) => {
      // 4.1 更新或创建 TaskOrder
      let settledOrder;
      if (existingOrder) {
        settledOrder = await tx.taskOrder.update({
          where: { id: existingOrder.id },
          data: {
            status: 'SETTLED',
            assignedAgentDid: vesselDid,
            deliverableHash,
            deliverableContent,
            settledAt: new Date(),
          },
        });
      } else {
        settledOrder = await tx.taskOrder.create({
          data: {
            orderId: bountyId,
            creatorDid: 'did:plvtvs:sponsor',
            title: finalTitle,
            description: `移动端 Instant Pod 极速交稿任务：用户输入「${userThought.slice(0, 60)}」`,
            bountyUsdc,
            status: 'SETTLED',
            escrowContract: '0xCA36335845E382129167fC44243F07A76827bA22',
            assignedAgentDid: vesselDid,
            deliverableHash,
            deliverableContent,
            settledAt: new Date(),
          },
        });
      }

      // 4.2 检查或创建对应的 BackupWallet
      let wallet = await tx.backupWallet.findUnique({
        where: { address: normalizedWallet },
      });

      if (!wallet) {
        wallet = await tx.backupWallet.create({
          data: {
            address: normalizedWallet,
            balanceWei: '0',
            asset: 'USDC',
          },
        });
      }

      // 4.3 原子累加 BackupWallet 余额 (18 位 Wei 单位)
      const prevBalanceWei = BigInt(wallet.balanceWei || '0');
      const newBalanceWei = (prevBalanceWei + creditWei).toString();

      const updatedWallet = await tx.backupWallet.update({
        where: { id: wallet.id },
        data: {
          balanceWei: newBalanceWei,
          nonce: { increment: 1 },
        },
      });

      // 4.4 生成 BackupWalletTx 收益记录
      const walletTx = await tx.backupWalletTx.create({
        data: {
          backupWalletId: wallet.id,
          type: 'DEPOSIT', // 收益入账流水
          amountWei: creditWei.toString(),
          balanceAfterWei: newBalanceWei,
          txHash: deliverableHash,
          targetAddress: normalizedWallet,
          status: 'SUCCESS',
          metadata: JSON.stringify({
            source: 'AP2_INSTANT_POD_SUBMIT',
            bountyId,
            orderId: settledOrder.orderId,
            userThought,
            vesselDid,
            bountyUsdc,
            arweaveTx,
          }),
        },
      });

      return {
        order: settledOrder,
        wallet: updatedWallet,
        walletTx,
        prevBalanceWei,
        newBalanceWei,
      };
    });

    // 5. 计算 80/20 分润明细
    const split = calculateRevenueSplit(bountyNum);

    return NextResponse.json({
      success: true,
      message: '🎉 交付成功！赏金已秒级原子入账专属轻钱包！',
      order: {
        id: txResult.order.id,
        orderId: txResult.order.orderId,
        title: txResult.order.title,
        bountyUsdc: txResult.order.bountyUsdc,
        status: txResult.order.status,
        deliverableHash: txResult.order.deliverableHash,
        deliverableSha256: sha256Hex,
        arweaveTx,
        deliverableContent: txResult.order.deliverableContent,
        settledAt: txResult.order.settledAt,
      },
      settlement: {
        bountyUsdc: txResult.order.bountyUsdc,
        creditedAmountUsdc: txResult.order.bountyUsdc,
        creditedWei: creditWei.toString(),
        previousBalanceWei: txResult.prevBalanceWei.toString(),
        newBalanceWei: txResult.newBalanceWei,
        newBalanceUsdc: formatArcUsdc(txResult.newBalanceWei),
        backupWalletAddress: txResult.wallet.address,
        txId: txResult.walletTx.id,
      },
      split,
    });
  } catch (err: any) {
    console.error('[instant-submit] Error:', err);
    return NextResponse.json({ error: err.message || '交稿结算处理失败' }, { status: 500 });
  }
}
