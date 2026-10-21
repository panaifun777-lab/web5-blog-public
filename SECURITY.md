# Security Policy

## Supported versions

Security fixes are provided for the `main` branch only. Older commits, forks,
and modified deployments are not supported.

## Reporting a vulnerability

Please report vulnerabilities privately through **GitHub Security Advisories**
for this repository (Security tab -> "Report a vulnerability").

Do **not** open a public issue, discussion, or pull request for a suspected
vulnerability. Do not disclose details publicly until a fix has been released
and coordinated disclosure has been agreed.

Include, where possible:

- A description of the issue and its impact.
- Steps to reproduce or a proof of concept.
- Affected endpoint, contract, or file.
- Any suggested remediation.

## Scope notes

The following surfaces are security-sensitive and especially welcome in reports:

- **x402 / EIP-712 settlement**: voucher signing and verification, domain and
  type definitions, content/author binding, nonce replay protection, voucher
  expiry, and atomic debit of the prepaid balance.
- **Authentication and sessions**: Telegram Mini App `initData` HMAC
  verification, wallet login and wallet-binding flows, session-token signing,
  and admin authorization.
- **Smart contracts**: `BudgetFence`, `ContentNFT`, `VesselAuth`,
  `GenesisCurveVault`, and `WBOGToken`, including role and budget enforcement.
- **API authorization**: admin routes, bounty settlement, withdrawal, and
  wallet-binding endpoints.

## Secrets

Production secrets must never be committed to this repository. Use environment
variables (see `.env.example`) and your platform's secret manager. If you
believe a secret has been exposed, rotate it immediately and report the exposure
privately.

## Contact

For non-sensitive security questions only, contact
https://x.com/PiaoshuAgent. Never send private keys, seed phrases, API keys, or
other credentials through social media.
