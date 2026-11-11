// ════════════════════════════════════════════════════════════════
// src/lib/web5/x402/client-interceptor.ts
// x402 客户端自动重试 Fetch 拦截器 — 支付挑战解析、预付费余额扣减与支付收据回传
// 规范参考: https://github.com/x402-foundation/x402
// ════════════════════════════════════════════════════════════════

export interface X402PaymentChallenge {
  priceUsdc: string;
  recipient: string;
  memo?: string;
  currency: string;
  network?: string;
  chainId?: number;
  contentId?: string;
  authorDid?: string;
  description?: string;
  rawAuthenticateHeader?: string;
}

export interface X402ClientOptions {
  /** 签名者/付款方 EVM 地址 (必须持有站内预付费余额) */
  signerAddress?: string;
  /** 消费与扣费端点 (默认 '/api/x402/consume') */
  consumeEndpoint?: string;
  /** 最大自动重试次数 (默认 1) */
  maxRetries?: number;
  /** 收到 402 支付挑战时的回调 */
  onPaymentRequired?: (challenge: X402PaymentChallenge) => void;
  /** 支付成功获得收据后的回调 */
  onPaymentSuccess?: (receipt: string, challenge: X402PaymentChallenge) => void;
  /** 支付或重试出错时的回调 */
  onPaymentError?: (error: Error, challenge: X402PaymentChallenge) => void;
  /** 可选的自定义钱包签名器或证明生成函数 */
  walletSigner?: (challenge: X402PaymentChallenge) => Promise<{ token: string; receiptId: string }>;
}

export interface X402FetchResult extends Response {
  x402Paid?: boolean;
  x402Receipt?: string;
}

/**
  * 解析 HTTP 402 响应中的支付挑战
  * 同时支持 WWW-Authenticate 标头与 JSON 响应体结构
  */
export async function parseX402Challenge(response: Response): Promise<X402PaymentChallenge> {
  const wwwAuth = response.headers.get('WWW-Authenticate') || '';
  const challenge: X402PaymentChallenge = {
    priceUsdc: response.headers.get('X-402-Price-USDC') || '0.05',
    recipient: response.headers.get('X-402-Recipient') || '',
    currency: 'USDC',
    rawAuthenticateHeader: wwwAuth,
  };

  // 解析 WWW-Authenticate x402 格式: x402 token="USDC,WBOG", amount="0.05", to="0x...", chain_id="1"
  if (wwwAuth.includes('x402')) {
    const amountMatch = /amount="([^"]+)"/i.exec(wwwAuth);
    if (amountMatch) challenge.priceUsdc = amountMatch[1];

    const toMatch = /to="([^"]+)"/i.exec(wwwAuth);
    if (toMatch) challenge.recipient = toMatch[1];

    const chainMatch = /chain_id="([^"]+)"/i.exec(wwwAuth);
    if (chainMatch) challenge.chainId = parseInt(chainMatch[1], 10);
  }

  // 尝试读取 JSON 响应体以获取更精确的 requirement 结构
  try {
    const cloned = response.clone();
    const data = await cloned.json();
    if (data && typeof data === 'object') {
      const reqInfo = data.requirement || data;
      if (reqInfo.priceUsdc) challenge.priceUsdc = reqInfo.priceUsdc;
      if (reqInfo.recipientAddress) challenge.recipient = reqInfo.recipientAddress;
      if (reqInfo.recipient) challenge.recipient = reqInfo.recipient;
      if (reqInfo.currency) challenge.currency = reqInfo.currency;
      if (reqInfo.network) challenge.network = reqInfo.network;
      if (reqInfo.chainId) challenge.chainId = reqInfo.chainId;
      if (reqInfo.contentId) challenge.contentId = reqInfo.contentId;
      if (reqInfo.authorDid) challenge.authorDid = reqInfo.authorDid;
      if (reqInfo.description) challenge.description = reqInfo.description;
    }
  } catch {
    // 响应体可能不是 JSON，忽略解析错误
  }

  return challenge;
}

/**
  * 执行 x402 支付挑战：调用预付费扣费端点获得授权 Token 与收据
  */
export async function executeX402Payment(
  challenge: X402PaymentChallenge,
  options: X402ClientOptions
): Promise<{ token: string; receiptId: string }> {
  if (options.walletSigner) {
    return await options.walletSigner(challenge);
  }

  const signerAddress = options.signerAddress || (typeof window !== 'undefined' ? localStorage.getItem('web5_wallet_address') || '' : '');
  if (!signerAddress) {
    throw new Error('x402 Payment Error: No signerAddress provided and no wallet address stored in session.');
  }

  const consumeEndpoint = options.consumeEndpoint || '/api/x402/consume';
  const res = await fetch(consumeEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountUsdc: challenge.priceUsdc,
      recipient: challenge.recipient,
      contentId: challenge.contentId,
      authorDid: challenge.authorDid,
      signerAddress,
      memo: challenge.description || 'x402 Autonomous API Access',
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: 'Unknown consumption error' }));
    throw new Error(`x402 Payment Consumption Failed (${res.status}): ${errBody.error || errBody.reason || res.statusText}`);
  }

  const data = await res.json();
  const token = data.token || res.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const receiptId = data.receiptId || res.headers.get('X-402-Payment-Receipt') || 'x402_rcpt_default';

  if (!token) {
    throw new Error('x402 Payment Error: No authorization token received from payment gateway.');
  }

  return { token, receiptId };
}

/**
  * 包装原生 fetch 的 x402 自动重试拦截器函数
  * 当捕获到 HTTP 402 Payment Required 时，自动解析挑战、扣费并携带支付凭证重试请求。
  */
  export async function x402Fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    options: X402ClientOptions = {}
  ): Promise<Response> {
    const maxRetries = options.maxRetries ?? 1;
    let attempts = 0;

    // 执行初始请求
    let response = await fetch(input, init);

    while (response.status === 402 && attempts < maxRetries) {
      attempts++;
      const challenge = await parseX402Challenge(response);

      if (options.onPaymentRequired) {
        options.onPaymentRequired(challenge);
      }

      try {
        const { token, receiptId } = await executeX402Payment(challenge, options);

        if (options.onPaymentSuccess) {
          options.onPaymentSuccess(receiptId, challenge);
        }

        // 构建带有支付凭证的重试请求头
        const originalHeaders = new Headers(init?.headers || {});
        originalHeaders.set('Authorization', `Bearer ${token}`);
        originalHeaders.set('X-402-Payment-Receipt', receiptId);
        originalHeaders.set('X-402-Payment-Authorization', `Web5-Voucher ${token}`);

        const retryInit: RequestInit = {
          ...init,
          headers: originalHeaders,
        };

        response = await fetch(input, retryInit);
        (response as X402FetchResult).x402Paid = true;
        (response as X402FetchResult).x402Receipt = receiptId;
        break;
      } catch (err: any) {
        if (options.onPaymentError) {
          options.onPaymentError(err, challenge);
        }
        throw err;
      }
    }

    return response;
  }

/**
  * 创建绑定了默认选项的专用 x402 Fetch 客户端实例
  */
export function createX402Fetch(defaultOptions: X402ClientOptions) {
  return function configuredX402Fetch(input: RequestInfo | URL, init?: RequestInit, runtimeOptions?: X402ClientOptions) {
    return x402Fetch(input, init, { ...defaultOptions, ...runtimeOptions });
  };
}
