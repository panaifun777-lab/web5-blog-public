# Proof 0 通行检查表 (proof0_check.py)

Automated gate for the external read-only audit `web5-blog-proof0-tong-xing-biao.pdf`.
It polls the public discovery + detail surfaces of a Web5.blog deployment and
applies the **9 go/no-go rules**. Exit code is `0` **only** when all 9 pass;
any failure yields a non-zero exit so it can gate CI or a release pipeline.

> The rule set below is **derived** from the source PDF and reconciled against
> the implemented fixes in code. If the PDF ever changes a rule's wording,
> update `proof0_check.py` and this README together.

## Run

```bash
# against the live site (default base https://web5.blog)
python3 proof0_check.py

# against a local build
python3 proof0_check.py --base http://localhost:3000

# point the demo-detail check at a known demo/seed order
python3 proof0_check.py --base https://web5.blog --demo-order-id ap2-task-seed-1

# dump raw responses + write a JSON report
python3 proof0_check.py --raw --out proof0_report.json
```

Python 3 standard library only — no pip install required.

## Endpoints polled (6)

| # | Endpoint | Purpose |
|---|----------|---------|
| 1 | `GET /api/market/x402-market` | machine manifest (JSON) |
| 2 | `GET /api/market/llms` | llms.txt (plain text) |
| 3 | `GET /api/ai/capabilities` | A2A capability catalog (JSON) |
| 4 | `GET /api/daemon/health` | health (JSON) |
| 5 | `GET /task/<demoOrderId>` | demo detail page (HTML) |
| 6 | `GET /api/commerce/tasks` | open bounty listing (JSON) |

## Rules (9)

| ID | Audit item | What it verifies |
|----|------------|------------------|
| R1 | Item 1 — routing table | `paymentRouting.modes` ⊇ {PER_CALL, SESSION, ESCROW} and every offering carries `routingMode`. |
| R2 | Item 2 — idempotency | `idempotency.nonceAcceptedOnce === true` and the `paid_not_served` rule is documented (no double-charge). |
| R3 | Item 3 — voucher attribution | `settlement.voucher.fields` includes `taskId` **and** `sessionId`. |
| R4 | Item 4 — limit-overflow branch | `limitOverflow.branches` defines `A_RAISE` **and** `B_ISOLATE`. |
| R5 | Item 5 — session-envelope min fields | `sessionEnvelope.minFields` contains the 9 required fields. |
| R6 | Item 6 — demo state separation (manifest) | `stateMachine` includes `DEMO_SETTLED` and no `ap2-task-seed-/meme-` order appears in `openBountySamples`. |
| R7 | Item 6 — demo detail page reachable | `GET /task/<demoOrderId>` returns HTTP 200 (was 404 before the inspectable lookup was wired in). |
| R8 | Item 9 — wording unification | response header `X-402-Status` is exactly `ACTIVE` or `DISABLED` (no legacy `paused`/`active`). |
| R9 | Item 3/6 — llms.txt consistency | llms.txt mentions `DEMO_SETTLED` and its voucher-fields line carries `taskId` + `sessionId`. |

## CI gating

```yaml
# .github/workflows/proof0.yml (sketch)
- name: Proof 0 gate
  run: python3 scripts/proof0/proof0_check.py --base https://web5.blog
```

Or via the npm script:

```bash
npm run proof0 -- --base https://web5.blog
```

A non-zero exit fails the workflow. Treat a failed gate as a release blocker:
do **not** deploy a build that does not pass 9/9.
