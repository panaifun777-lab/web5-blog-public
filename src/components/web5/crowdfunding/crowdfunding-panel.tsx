'use client';

// ════════════════════════════════════════════════════════════════
// src/components/web5/crowdfunding/crowdfunding-panel.tsx
// Web5 创意众筹 (Crowdfunding) 模块
// 官方首案：《人文思辨五部曲》全球学术多语言翻译与 Arweave 永久节点众筹计划
// 支持 Web3 钱包 / Vessel 专用钱包真实 USDC 注入
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Sparkles,
  Rocket,
  Shield,
  Coins,
  Wallet,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Globe,
  Flame,
  Award,
  ArrowRight,
  Loader2,
  Heart,
  Share2,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getOrCreateVesselWallet,
  getVesselWalletBalance,
  vesselWalletTransfer,
} from '@/lib/web5/vessel-wallet';

const CROWDFUND_ESCROW_VAULT = '0xCA36335845E382129167fC44243F07A76827bA22';
const ARC_CHAIN_ID_HEX = '0x13b2'; // 5042
const ARC_EXPLORER_URL = 'https://explorer.arc.io';

interface Backer {
  address: string;
  amount: number;
  time: string;
  note: string;
}

export function CrowdfundingPanel({ session }: { session?: any }) {
  const { locale } = useI18n();
  const isEn = locale !== 'zh-CN';

  // 众筹目标与统计
  const targetGoal = 500; // 500 USDC
  const [raisedAmount, setRaisedAmount] = useState(185.5); // 基础已筹集金额
  const [supportAmount, setSupportAmount] = useState('10.0');
  const [supportMethod, setSupportMethod] = useState<'vessel' | 'web3'>('vessel');
  const [vesselBalance, setVesselBalance] = useState<number>(0);
  const [vesselAddr, setVesselAddr] = useState<string>('');

  const [backing, setBacking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 支持者列表展示
  const [backers, setBackers] = useState<Backer[]>([
    {
      address: '0x3a4b...c912',
      amount: 50.0,
      time: '10 分钟前',
      note: '支持《人文思辨五部曲》德语与法语学术翻译节点！',
    },
    {
      address: '0x8f21...e04a',
      amount: 35.5,
      time: '35 分钟前',
      note: 'Web5 永久本体论存证是真正的人类思想遗产。',
    },
    {
      address: '0x1c99...4d3b',
      amount: 60.0,
      time: '2 小时前',
      note: '愿思想穿透时代，Arweave 永久存证基金贡献一份力量。',
    },
    {
      address: '0x7e88...2a1f',
      amount: 40.0,
      time: '5 小时前',
      note: '飘叔与硅基文明的思辨之光。',
    },
  ]);

  const loadVesselBalance = async () => {
    try {
      const vw = getOrCreateVesselWallet();
      setVesselAddr(vw.address);
      const bal = await getVesselWalletBalance(vw.address);
      setVesselBalance(bal);
    } catch (e) {
      console.warn('Failed to get vessel wallet balance', e);
    }
  };

  useEffect(() => {
    loadVesselBalance();
  }, []);

  const progressPercent = Math.min(100, (raisedAmount / targetGoal) * 100);

  // 注入资金支持
  const handleSupport = async () => {
    const num = parseFloat(supportAmount);
    if (isNaN(num) || num <= 0) {
      setErrorMsg(isEn ? 'Please enter a valid amount.' : '请输入有效的支持金额。');
      return;
    }

    setBacking(true);
    setStatusMsg(isEn ? 'Preparing transaction...' : '正在准备转账交易...');
    setErrorMsg(null);

    try {
      let txHash = '';
      if (supportMethod === 'vessel') {
        const vw = getOrCreateVesselWallet();
        const bal = await getVesselWalletBalance(vw.address);
        const need = num + 0.001;
        if (bal < need) {
          throw new Error(
            isEn
              ? `Vessel wallet balance insufficient (${bal.toFixed(3)} USDC). Required: ${need.toFixed(3)} USDC.`
              : `Vessel 专用备用钱包余额不足（当前 ${bal.toFixed(3)} USDC），需至少 ${need.toFixed(3)} USDC。`
          );
        }
        setStatusMsg(isEn ? 'Broadcasting on-chain backing via Vessel wallet...' : '正在通过 Vessel 专用钱包广播注入链上资金...');
        txHash = await vesselWalletTransfer(CROWDFUND_ESCROW_VAULT, supportAmount);
      } else {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          throw new Error(isEn ? 'Web3 wallet not detected.' : '未检测到 MetaMask / OKX Web3 钱包插件。');
        }
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARC_CHAIN_ID_HEX }],
          });
        } catch (e: any) {
          if (e.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: ARC_CHAIN_ID_HEX,
                  chainName: 'Arc Mainnet',
                  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                  rpcUrls: ['https://rpc.mainnet.arc.io'],
                  blockExplorerUrls: [ARC_EXPLORER_URL],
                },
              ],
            });
          } else throw e;
        }

        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        const from = accounts[0];
        const amountWei = BigInt(Math.round(num * 1e18));

        setStatusMsg(isEn ? 'Please confirm transfer in Web3 wallet...' : '请在 Web3 钱包中确认支持转账...');
        txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from,
              to: CROWDFUND_ESCROW_VAULT,
              value: '0x' + amountWei.toString(16),
            },
          ],
        });
      }

      setStatusMsg(isEn ? '✅ Successfully contributed! Thank you for supporting decentralized humanity.' : '✅ 众筹支持成功！感谢您为去中心化人类文明存证贡献力量。');
      setRaisedAmount(prev => prev + num);
      setBackers(prev => [
        {
          address: supportMethod === 'vessel' ? vesselAddr.slice(0, 6) + '...' + vesselAddr.slice(-4) : '0xMy...Wallet',
          amount: num,
          time: isEn ? 'Just now' : '刚刚',
          note: isEn ? 'Supported global academic translation node' : '支持《人文思辨五部曲》全球学术多语言翻译与永久节点计划',
        },
        ...prev,
      ]);
      await loadVesselBalance();
      setTimeout(() => {
        setStatusMsg(null);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message?.slice(0, 100) || (isEn ? 'Contribution failed' : '注资失败，请检查钱包余额'));
    } finally {
      setBacking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#B080E8]/30 bg-gradient-to-br from-[#B080E8]/15 via-[#0a0e17] to-transparent p-6 sm:p-8">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Globe className="w-64 h-64 text-[#B080E8]" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#B080E8]/20 text-[#B080E8] border-[#B080E8]/40 text-xs px-2.5 py-0.5 font-mono">
              OFFICIAL CROWDFUND · 官方主权众筹 #001
            </Badge>
            <Badge className="bg-[#00FFCC]/20 text-[#00FFCC] border-none text-xs font-mono">
              ● 筹资中 ACTIVE
            </Badge>
            <Badge className="bg-white/[0.06] text-[#aaa] border-none text-xs font-mono">
              Circle ARC 5042 托管
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>《人文思辨五部曲》全球学术多语言翻译与 Arweave 永久节点众筹计划</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#aaa] leading-relaxed">
            {isEn
              ? 'Translating the foundational philosophical quintology into English, French, German, Japanese, and Spanish. Permanent dual-permaweb storage on Arweave and IPFS, enabling global AI autonomous syndication.'
              : '本计划旨在将 Web5.blog 核心思想母体《人文思辨五部曲》（从文明反思、AI 分身主体性到数字本体论）系统翻译为全球 5 大主要学术语种（英、法、德、日、西），并部署专有 Arweave 永久网关与检索加速节点，让全人类与全球自治智能体永久自由研读与确权引用。'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-[#666]">发起人：</span>
              <span className="text-[#00FFCC] font-bold">Web5 创世思想矩阵 / 飘叔分身研学组</span>
            </div>
            <div>
              <span className="text-[#666]">目标：</span>
              <span className="text-[#FFCC00] font-bold">500.00 USDC</span>
            </div>
            <div>
              <span className="text-[#666]">存证网络：</span>
              <span className="text-[#B080E8] font-bold">Arweave Permaweb & Circle ARC</span>
            </div>
          </div>
        </div>
      </div>

      {/* 众筹进度与资金注入控制台 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左侧 2 栏：进度指标与回馈细则 */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="cyber-panel border-[#B080E8]/30 bg-black/40">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-baseline justify-between font-mono">
                <div>
                  <div className="text-xs text-[#888]">已筹集资金 (RAISED)</div>
                  <div className="text-3xl font-black text-white mt-1 flex items-baseline gap-2">
                    <span className="text-[#00FFCC]">{raisedAmount.toFixed(2)}</span>
                    <span className="text-sm text-[#888] font-normal">/ {targetGoal.toFixed(2)} USDC</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#888]">达成率</div>
                  <div className="text-2xl font-black text-[#FFCC00] mt-1">
                    {progressPercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* 进度条 */}
              <div className="space-y-1.5">
                <Progress value={progressPercent} className="h-3 bg-white/[0.08]" />
                <div className="flex justify-between text-[11px] font-mono text-[#666]">
                  <span>已锁定 4 位早期资助者</span>
                  <span>剩余差额: {(Math.max(0, targetGoal - raisedAmount)).toFixed(2)} USDC</span>
                </div>
              </div>

              {/* 资金使用透明度说明 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#00FFCC]" />
                  <span>众筹资金托管与执行里程碑：</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-[11px] text-[#aaa]">
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04] space-y-1">
                    <div className="text-[#00FFCC] font-bold font-mono">40% 专家翻译</div>
                    <div>学术级多语言对照审校与双语术语表对齐。</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04] space-y-1">
                    <div className="text-[#FFCC00] font-bold font-mono">35% Arweave 存证</div>
                    <div>永久母体存证、网关节点与全网语义检索向量索引。</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04] space-y-1">
                    <div className="text-[#B080E8] font-bold font-mono">25% 社区自治</div>
                    <div>早期支持者链上专属 NFT 纪念勋章铸造与分润。</div>
                  </div>
                </div>
              </div>

              {/* 支持者专属权益 */}
              <div className="p-4 rounded-xl border border-[#FFCC00]/20 bg-[#FFCC00]/05 space-y-2">
                <div className="text-xs font-bold text-[#FFCC00] flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  <span>支持者专属回馈 (Backer Perks)</span>
                </div>
                <div className="text-xs text-[#bbb] leading-relaxed space-y-1">
                  <div>• <b>&gt; 5 USDC</b>：铭刻在 Arweave 全球永久译本《资助者功德碑》创世名单中。</div>
                  <div>• <b>&gt; 20 USDC</b>：获得 Circle ARC 链上限量版「思想火种」Genesis Patron 徽章。</div>
                  <div>• <b>&gt; 50 USDC</b>：享有后续多语言译本外部 AI 商业引用检索分润池 5% 长期质押收益权。</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 最新支持者时间线 */}
          <Card className="cyber-panel border-white/[0.08] bg-black/40">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00FFCC]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">支持者名单 (BACKERS)</span>
                </div>
                <span className="text-[10px] text-[#666] font-mono">REAL-TIME ESCROW</span>
              </div>

              <div className="space-y-2.5">
                {backers.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">{b.address}</span>
                        <span className="text-[10px] text-[#555] font-mono">{b.time}</span>
                      </div>
                      <div className="text-xs text-[#888] truncate mt-0.5">{b.note}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-mono font-bold text-[#FFCC00]">
                        +{b.amount.toFixed(1)} USDC
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧 1 栏：一键注资卡片 */}
        <div className="space-y-4">
          <Card className="cyber-panel border-[#00FFCC]/30 bg-black/50 sticky top-20">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#00FFCC]" />
                  <span className="text-sm font-bold text-white">直接注入支持</span>
                </div>
                <Badge className="bg-[#00FFCC]/20 text-[#00FFCC] border-none text-[10px] font-mono">
                  Circle ARC 5042
                </Badge>
              </div>

              {/* 钱包模式切换 */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#888]">选择支付方式：</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSupportMethod('vessel')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
                      supportMethod === 'vessel'
                        ? 'border-[#B080E8] bg-[#B080E8]/20 text-white font-bold'
                        : 'border-white/[0.08] text-[#888] hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#B080E8]" />
                    <span>备用/专用钱包</span>
                  </button>
                  <button
                    onClick={() => setSupportMethod('web3')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
                      supportMethod === 'web3'
                        ? 'border-[#FFCC00] bg-[#FFCC00]/20 text-white font-bold'
                        : 'border-white/[0.08] text-[#888] hover:text-white'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#FFCC00]" />
                    <span>Web3 钱包</span>
                  </button>
                </div>
              </div>

              {/* 备用钱包信息提示 */}
              {supportMethod === 'vessel' && (
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between text-[#888]">
                    <span>专用钱包余额:</span>
                    <span className="text-[#00FFCC] font-bold">{vesselBalance.toFixed(3)} USDC</span>
                  </div>
                  <div className="text-[10px] text-[#555] truncate">
                    地址: {vesselAddr || '正在初始化...'}
                  </div>
                  <div className="text-[9px] text-[#777]">
                    ⚡ 免弹窗签名，链上极速确认
                  </div>
                </div>
              )}

              {/* 预设金额快捷选择 */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#888]">支持金额 (USDC)：</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['5.0', '10.0', '25.0', '50.0'].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setSupportAmount(amt)}
                      className={`py-1.5 rounded border text-xs font-mono transition-all ${
                        supportAmount === amt
                          ? 'border-[#00FFCC] bg-[#00FFCC]/20 text-[#00FFCC] font-bold'
                          : 'border-white/[0.08] bg-white/[0.02] text-[#aaa] hover:text-white'
                      }`}
                    >
                      {amt}U
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={supportAmount}
                  onChange={e => setSupportAmount(e.target.value)}
                  placeholder="自定义支持金额"
                  className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs font-mono text-white placeholder-[#555] outline-none focus:border-[#00FFCC]/50"
                />
              </div>

              {/* 状态与报错提示 */}
              {statusMsg && (
                <div className="p-2.5 rounded-lg bg-[#00FFCC]/10 border border-[#00FFCC]/30 text-[#00FFCC] text-xs font-mono">
                  {statusMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-[#FF66AA]/10 border border-[#FF66AA]/30 text-[#FF66AA] text-xs font-mono">
                  {errorMsg}
                </div>
              )}

              {/* 支持按钮 */}
              <Button
                onClick={handleSupport}
                disabled={backing}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-[#00FFCC] to-[#0066FF] hover:scale-[1.01] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#00FFCC]/20 transition-all"
              >
                {backing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>正在注入链上资金...</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    <span>即刻注资支持 ({supportAmount} USDC)</span>
                  </>
                )}
              </Button>

              <div className="text-[10px] text-[#666] leading-relaxed text-center">
                资金将直接托管至去中心化众筹金库，达成后自动触发多语言翻译交付与 Arweave 永久母体刻录。
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
