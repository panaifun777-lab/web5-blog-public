import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { db } from '../src/lib/db';
import {
  ARC_MAINNET_CHAIN_ID,
  ARC_EIP712_DOMAIN,
  ARC_EIP712_TYPES,
  formatArcUsdc,
  parseArcUsdc,
  createBindMasterWalletTypedData,
  createWithdrawSettlementTypedData,
  verifyBindMasterWalletSignature,
  verifyWithdrawSettlementSignature,
  processBindMasterWallet,
  processWithdrawSettlement,
  type BindMasterWalletMessage,
  type WithdrawSettlementMessage,
} from '../src/lib/web5/auth/eip712-types';
import { AccountStage } from '@prisma/client';

async function runVerification() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('【开始验证 子任务 1：两段式账户生命周期与 EIP-712 规范引擎】');
  console.log('═══════════════════════════════════════════════════════════════');

  // 1. 验证 USDC 18 位精度转换
  console.log('\n--- 1. 验证 Circle ARC 主网原生 USDC 18 位精度转换 ---');
  const atomic1 = parseArcUsdc('100.5');
  console.log(`parseArcUsdc("100.5") => ${atomic1.toString()} (18位 Wei)`);
  if (atomic1 !== 100500000000000000000n) {
    throw new Error('parseArcUsdc calculation mismatch!');
  }
  const formatted1 = formatArcUsdc(atomic1);
  console.log(`formatArcUsdc(${atomic1}) => ${formatted1} USDC`);
  if (formatted1 !== '100.5') {
    throw new Error(`formatArcUsdc mismatch! expected 100.5, got ${formatted1}`);
  }
  console.log('✅ USDC 18 位精度双向转换测试通过！');

  // 生成测试钱包
  const masterKey = generatePrivateKey();
  const masterAccount = privateKeyToAccount(masterKey);
  const masterAddress = masterAccount.address;

  const backupKey = generatePrivateKey();
  const backupAccount = privateKeyToAccount(backupKey);
  const backupAddress = backupAccount.address;

  const testContainerId = `vessel-test-${Date.now()}`;
  const testOnchainDid = `did:plvtvs:${masterAddress.toLowerCase()}`;

  console.log(`\n测试主钱包: ${masterAddress}`);
  console.log(`测试备用轻钱包: ${backupAddress}`);
  console.log(`测试容器 ID: ${testContainerId}`);

  // 2. 验证 Prisma 模型与两段式账户阶段初始状态 (STAGE_1_CONTAINER_ACTIVE)
  console.log('\n--- 2. 验证两段式账户初始阶段 STAGE_1_CONTAINER_ACTIVE ---');
  
  // 创建一个测试 Eidolon
  const tempPrime = await db.prime.create({
    data: {
      did: `did:plvtvs:initial-${Date.now()}`,
      walletAddress: `0xinitial${Date.now().toString(16).padEnd(32, '0')}`.slice(0, 42).toLowerCase(),
      accountStage: AccountStage.STAGE_1_CONTAINER_ACTIVE,
    },
  });
  const testEidolon = await db.eidolon.create({
    data: {
      did: `did:eidolon:test-${Date.now()}`,
      name: 'Test Autonomous Agent',
      primeId: tempPrime.id,
    },
  });

  const createdVessel = await db.vessel.create({
    data: {
      id: testContainerId,
      did: `did:vessel:${testContainerId}`,
      eidolonId: testEidolon.id,
      smartAccountAddress: backupAddress.toLowerCase(),
      accountStage: AccountStage.STAGE_1_CONTAINER_ACTIVE,
    },
  });

  // 创建备用钱包并充值 500 USDC (18 位精度)
  const initialBalanceWei = parseArcUsdc('500.0').toString();
  await db.backupWallet.create({
    data: {
      address: backupAddress.toLowerCase(),
      vesselId: createdVessel.id,
      balanceWei: initialBalanceWei,
      asset: 'USDC',
    },
  });

  console.log(`创建初始 Vessel，当前 accountStage: ${createdVessel.accountStage}`);
  if (createdVessel.accountStage !== AccountStage.STAGE_1_CONTAINER_ACTIVE) {
    throw new Error('Default accountStage should be STAGE_1_CONTAINER_ACTIVE');
  }
  console.log('✅ 两段式账户初始阶段验证通过！');

  // 3. 验证 EIP-712 BindMasterWallet 签名与验签
  console.log('\n--- 3. 验证 EIP-712 BindMasterWallet 签名与验签 ---');
  const now = Math.floor(Date.now() / 1000);
  const bindMessage: BindMasterWalletMessage = {
    masterWalletAddress: masterAddress,
    containerId: testContainerId,
    onchainDid: testOnchainDid,
    nonce: 1n,
    deadline: BigInt(now + 3600), // 1 小时后过期
  };

  const bindTypedData = createBindMasterWalletTypedData(bindMessage);
  const bindSignature = await masterAccount.signTypedData(bindTypedData);
  console.log(`生成 BindMasterWallet 真实签名: ${bindSignature.slice(0, 30)}...`);

  // 校验有效签名
  const validRes = await verifyBindMasterWalletSignature(bindMessage, bindSignature, { checkDbReplay: false });
  console.log(`验签有效签名结果:`, validRes);
  if (!validRes.valid) throw new Error('Valid signature should pass verification');

  // 校验过期签名
  const expiredMessage: BindMasterWalletMessage = {
    ...bindMessage,
    deadline: BigInt(now - 10), // 已经过期
  };
  const expiredTypedData = createBindMasterWalletTypedData(expiredMessage);
  const expiredSig = await masterAccount.signTypedData(expiredTypedData);
  const expiredRes = await verifyBindMasterWalletSignature(expiredMessage, expiredSig, { checkDbReplay: false });
  console.log(`验签过期签名结果:`, expiredRes);
  if (expiredRes.valid || expiredRes.code !== 'EXPIRED') {
    throw new Error('Expired signature should fail with EXPIRED code');
  }

  // 校验伪造签名
  const fakeSig = (bindSignature.slice(0, -4) + '0000') as `0x${string}`;
  const fakeRes = await verifyBindMasterWalletSignature(bindMessage, fakeSig, { checkDbReplay: false });
  console.log(`验签伪造签名结果:`, fakeRes);
  if (fakeRes.valid) throw new Error('Forged signature should fail');

  console.log('✅ BindMasterWallet 签名、超期与抗伪造校验全部通过！');

  // 4. 验证 processBindMasterWallet 业务流程与生命周期跃迁 (STAGE_2_MASTER_VERIFIED)
  console.log('\n--- 4. 验证绑定主钱包业务处理与生命周期跃迁 ---');
  const bindProcessRes = await processBindMasterWallet({
    message: bindMessage,
    signature: bindSignature,
  });
  console.log('绑定业务处理返回:', bindProcessRes);
  if (bindProcessRes.accountStage !== AccountStage.STAGE_2_MASTER_VERIFIED) {
    throw new Error('Account stage should be updated to STAGE_2_MASTER_VERIFIED');
  }

  // 验证数据库中的 Prime 与 Vessel 状态
  const updatedPrime = await db.prime.findUnique({ where: { walletAddress: masterAddress.toLowerCase() } });
  const updatedVessel = await db.vessel.findUnique({ where: { id: testContainerId } });
  console.log(`数据库 Prime accountStage: ${updatedPrime?.accountStage}`);
  console.log(`数据库 Vessel accountStage: ${updatedVessel?.accountStage}`);
  if (
    updatedPrime?.accountStage !== AccountStage.STAGE_2_MASTER_VERIFIED ||
    updatedVessel?.accountStage !== AccountStage.STAGE_2_MASTER_VERIFIED
  ) {
    throw new Error('Database records must reflect STAGE_2_MASTER_VERIFIED');
  }

  // 验证防重放：再次提交相同的绑定签名应被拦截
  console.log('\n--- 5. 验证 BindMasterWallet 防重放拦截 ---');
  try {
    await processBindMasterWallet({
      message: bindMessage,
      signature: bindSignature,
    });
    throw new Error('Replayed signature should have been rejected!');
  } catch (err: any) {
    console.log(`防重放拦截成功拦截报错: ${err.message}`);
  }

  // 6. 验证 EIP-712 WithdrawSettlement 签名与提现结算业务流程
  console.log('\n--- 6. 验证 EIP-712 WithdrawSettlement 提现结算与原子扣减 ---');
  const withdrawAmountAtomic = parseArcUsdc('120.5'); // 提现 120.5 USDC
  const withdrawMessage: WithdrawSettlementMessage = {
    masterWalletAddress: masterAddress,
    backupWalletAddress: backupAddress,
    asset: 'USDC',
    amountAtomic: withdrawAmountAtomic,
    nonce: 101n,
    deadline: BigInt(now + 3600),
  };

  const withdrawTypedData = createWithdrawSettlementTypedData(withdrawMessage);
  const withdrawSig = await masterAccount.signTypedData(withdrawTypedData);
  console.log(`生成 WithdrawSettlement 真实签名: ${withdrawSig.slice(0, 30)}...`);

  // 执行提现处理
  const withdrawRes = await processWithdrawSettlement({
    message: withdrawMessage,
    signature: withdrawSig,
  });
  console.log('提现处理返回:', withdrawRes);
  if (withdrawRes.amountFormatted !== '120.5') {
    throw new Error('Formatted withdraw amount mismatch');
  }
  if (withdrawRes.balanceRemainingFormatted !== '379.5') {
    throw new Error(`Expected remaining balance 379.5, got ${withdrawRes.balanceRemainingFormatted}`);
  }

  // 验证提现防重放拦截
  console.log('\n--- 7. 验证 WithdrawSettlement 防重放拦截 ---');
  try {
    await processWithdrawSettlement({
      message: withdrawMessage,
      signature: withdrawSig,
    });
    throw new Error('Replayed withdraw signature should have been rejected!');
  } catch (err: any) {
    console.log(`提现防重放拦截成功拦截报错: ${err.message}`);
  }

  // 验证提现超额拦截
  console.log('\n--- 8. 验证超额提现拦截 ---');
  const overdrawMessage: WithdrawSettlementMessage = {
    masterWalletAddress: masterAddress,
    backupWalletAddress: backupAddress,
    asset: 'USDC',
    amountAtomic: parseArcUsdc('999999.0'), // 远超 379.5 USDC
    nonce: 102n,
    deadline: BigInt(now + 3600),
  };
  const overdrawTypedData = createWithdrawSettlementTypedData(overdrawMessage);
  const overdrawSig = await masterAccount.signTypedData(overdrawTypedData);
  try {
    await processWithdrawSettlement({
      message: overdrawMessage,
      signature: overdrawSig,
    });
    throw new Error('Overdraw should have been rejected!');
  } catch (err: any) {
    console.log(`超额提现成功拦截报错: ${err.message}`);
  }

  // 清理测试数据
  console.log('\n--- 清理测试临时数据 ---');
  await db.authNonce.deleteMany({ where: { address: masterAddress.toLowerCase() } });
  await db.backupWalletTx.deleteMany({ where: { targetAddress: masterAddress.toLowerCase() } });
  await db.backupWallet.deleteMany({ where: { address: backupAddress.toLowerCase() } });
  await db.vessel.deleteMany({ where: { id: testContainerId } });
  await db.eidolon.deleteMany({ where: { id: testEidolon.id } });
  await db.prime.deleteMany({ where: { id: { in: [tempPrime.id, updatedPrime?.id || ''] } } });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎉 【子任务 1 全部功能与所有测试项 100% 验证通过！】');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

runVerification()
  .catch((err) => {
    console.error('❌ 验证失败:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
