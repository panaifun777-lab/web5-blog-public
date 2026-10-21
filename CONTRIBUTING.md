# Contributing to Web5.blog

Thanks for your interest in improving Web5.blog. This document covers the
basics for contributing code, documentation, and contract changes.

## Requirements

- **Node.js 20 LTS or newer** (Next.js 16 and Prisma 6).
- npm (the repository ships a `package-lock.json`).
- Optional: Foundry (`forge`) for compiling and testing contracts.

## Setup

```bash
npm install
cp .env.example .env      # fill in local values; never commit .env
npx prisma generate
npx prisma db push
npm run dev               # http://localhost:3000
```

The local SQLite database is created from `DATABASE_URL` in `.env`
(default: `file:./dev.db`, relative to `prisma/schema.prisma`).

## Build and checks

```bash
npm run build             # production build (standalone output)
npm start                 # run the production server
npm run lint              # ESLint
```

`npm run build` copies static assets with `cp`; run it from Git Bash, WSL, or a
POSIX shell on Windows. There is currently no automated test script in this
repository. Before opening a PR, at minimum run `npm run lint` and
`npm run build`, and manually exercise the routes you changed.

Contract changes:

```bash
cd contracts
forge build
forge test
```

## Secrets

- Never commit `.env`, private keys, API keys, bot tokens, entity secrets, or
  production database files.
- Use `.env.example` for documenting new variables, with empty or placeholder
  values only.
- If you discover a leaked secret, do not repeat it in a public issue; follow
  [SECURITY.md](SECURITY.md).

## Licensing of contributions

- Contributions to the application (`src/`, `public/`, configuration, docs,
  content) are accepted under the **Apache License 2.0**.
- Contributions to the on-chain contracts (`contracts/contracts/`) and contract
  deployment scripts (`contracts/scripts/`) are accepted under the **MIT
  License**.
- By submitting a pull request you confirm you have the right to license your
  contribution under the applicable license above.

## Pull requests

- Keep changes focused and describe the problem and the approach.
- Follow the existing code style and TypeScript conventions.
- Update documentation when behavior, APIs, env vars, or contract addresses
  change.
- Do not commit generated artifacts, build output, databases, logs, or
  `node_modules`.
- Note any security-sensitive changes (auth, payments, settlement, contracts)
  explicitly so they receive extra review.
- Be respectful; all participation is governed by
  [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
