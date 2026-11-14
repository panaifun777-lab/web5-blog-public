#!/usr/bin/env python3
"""Proof 0 通行检查表 — automated gate.

Polls the public discovery + detail surfaces of a Web5.blog deployment and
applies the 9 Proof 0 go/no-go rules. Exit code is 0 only when all 9 pass;
any failure yields a non-zero exit so it can gate CI / a release pipeline.

The rule set is derived from the external read-only audit
`web5-blog-proof0-tong-xing-biao.pdf` and reconciled against the implemented
fixes in code. If the source PDF ever changes the wording of a rule, update
the check here and the matching README section.

Endpoints polled (6):
  1. GET {base}/api/market/x402-market   (machine manifest, JSON)
  2. GET {base}/api/market/llms          (llms.txt, plain text)
  3. GET {base}/api/ai/capabilities      (A2A capability catalog, JSON)
  4. GET {base}/api/daemon/health        (health, JSON)
  5. GET {base}/task/<demoOrderId>       (demo detail page, HTML)
  6. GET {base}/api/commerce/tasks       (open bounty listing, JSON)

Rules (9):
  R1  Item 1  routing table present (paymentRouting modes + per-offering routingMode)
  R2  Item 2  idempotency rule present (nonce accepted once / paid_not_served)
  R3  Item 3  voucher attribution fields taskId + sessionId
  R4  Item 4  limit-overflow branch present (A_RAISE / B_ISOLATE)
  R5  Item 5  session-envelope minimum fields present
  R6  Item 6  demo state separation in manifest (DEMO_SETTLED + no demo in samples)
  R7  Item 6  demo detail page is reachable (HTTP 200, not 404)
  R8  Item 9  X-402-Status wording is ACTIVE/DISABLED (no legacy paused/active)
  R9  Item 3/6 llms.txt consistency (DEMO_SETTLED + taskId/sessionId in voucher line)

Usage:
  python3 proof0_check.py --base https://web5.blog --demo-order-id ap2-task-seed-1
  python3 proof0_check.py --base http://localhost:3000 --raw --out report.json
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone


def fetch(url, as_json=True, timeout=20):
    """Return (status, body) where body is parsed JSON or raw text."""
    req = urllib.request.Request(url, headers={"User-Agent": "proof0-check/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read().decode("utf-8", "replace")
            status = resp.getcode()
    except urllib.error.HTTPError as e:
        data = e.read().decode("utf-8", "replace") if e.fp else ""
        status = e.code
    except Exception as e:  # noqa: BLE001 - network/timeout both surface here
        return None, f"<fetch error: {e}>"
    if as_json:
        try:
            return status, json.loads(data)
        except json.JSONDecodeError:
            return status, {"__raw__": data}
    return status, data


def check(name, item, passed, detail):
    return {"name": name, "item": item, "pass": bool(passed), "detail": str(detail)}


def main():
    parser = argparse.ArgumentParser(description="Proof 0 通行检查表 gate")
    parser.add_argument("--base", default="https://web5.blog", help="Deployment base URL")
    parser.add_argument(
        "--demo-order-id",
        default="ap2-task-seed-1",
        help="A known demo/seed order id to verify the detail page opens (Item 6).",
    )
    parser.add_argument("--raw", action="store_true", help="Include raw responses in the report.")
    parser.add_argument("--out", help="Write the JSON report to this path.")
    args = parser.parse_args()

    base = args.base.rstrip("/")
    results = []

    # ── Endpoint 1: x402 market manifest ──
    m_status, manifest = fetch(f"{base}/api/market/x402-market")
    # ── Endpoint 2: llms.txt ──
    l_status, llms = fetch(f"{base}/api/market/llms", as_json=False)
    # ── Endpoint 3: capabilities ──
    c_status, caps = fetch(f"{base}/api/ai/capabilities")
    # ── Endpoint 4: health ──
    h_status, health = fetch(f"{base}/api/daemon/health")
    # ── Endpoint 5: demo detail page ──
    d_status, _detail = fetch(f"{base}/task/{args.demo_order_id}", as_json=False)
    # ── Endpoint 6: open bounty listing ──
    t_status, tasks = fetch(f"{base}/api/commerce/tasks")

    # R1 — Item 1: routing table
    pr = (manifest or {}).get("paymentRouting", {})
    modes = pr.get("modes", []) if isinstance(pr, dict) else []
    offerings = (manifest or {}).get("offerings", []) or []
    offering_modes = [o.get("routingMode") for o in offerings if isinstance(o, dict)]
    r1 = (
        isinstance(modes, list)
        and {"PER_CALL", "SESSION", "ESCROW"}.issubset(set(modes))
        and len(offerings) > 0
        and all(m in {"PER_CALL", "SESSION", "ESCROW"} for m in offering_modes)
    )
    results.append(check(
        "R1", "Item 1 routing table", r1,
        f"paymentRouting.modes={modes}; offering routingModes={offering_modes}",
    ))

    # R2 — Item 2: idempotency
    idem = (manifest or {}).get("idempotency", {}) or {}
    r2 = (
        idem.get("nonceAcceptedOnce") is True
        and "paid_not_served" in str(idem.get("paidButNotServed", ""))
    )
    results.append(check(
        "R2", "Item 2 idempotency", r2,
        f"nonceAcceptedOnce={idem.get('nonceAcceptedOnce')}; mentions paid_not_served="
        f"{'paid_not_served' in str(idem.get('paidButNotServed',''))}",
    ))

    # R3 — Item 3: voucher attribution fields
    fields = ((manifest or {}).get("settlement", {}) or {}).get("voucher", {}) or {}
    vfields = fields.get("fields", []) or []
    r3 = "taskId" in vfields and "sessionId" in vfields
    results.append(check(
        "R3", "Item 3 voucher attribution", r3, f"voucher.fields={vfields}",
    ))

    # R4 — Item 4: limit-overflow branch
    lo = (manifest or {}).get("limitOverflow", {}) or {}
    branches = lo.get("branches", {}) or {}
    r4 = "A_RAISE" in branches and "B_ISOLATE" in branches
    results.append(check(
        "R4", "Item 4 limit-overflow branch", r4, f"limitOverflow.branches={list(branches.keys())}",
    ))

    # R5 — Item 5: session-envelope minimum fields
    se = (manifest or {}).get("sessionEnvelope", {}) or {}
    min_fields = set(se.get("minFields", []) or [])
    required = {
        "signerAddress", "nonce", "timestamp", "amountUsdc",
        "contentId", "authorDid", "taskId", "sessionId", "signature",
    }
    r5 = required.issubset(min_fields)
    results.append(check(
        "R5", "Item 5 session-envelope min fields", r5,
        f"missing={sorted(required - min_fields)}",
    ))

    # R6 — Item 6: demo state separation in manifest
    sm = ((manifest or {}).get("bountyMarket", {}) or {}).get("stateMachine", []) or []
    samples = ((manifest or {}).get("bountyMarket", {}) or {}).get("openBountySamples", []) or []
    sample_ids = [s.get("orderId", "") for s in samples if isinstance(s, dict)]
    demo_in_samples = any(re.match(r"^ap2-task-(seed|meme)-", i) for i in sample_ids)
    r6 = ("DEMO_SETTLED" in sm) and (not demo_in_samples)
    results.append(check(
        "R6", "Item 6 demo state separation (manifest)", r6,
        f"stateMachine has DEMO_SETTLED={'DEMO_SETTLED' in sm}; "
        f"demo in samples={demo_in_samples} (n={len(sample_ids)})",
    ))

    # R7 — Item 6: demo detail page reachable
    r7 = d_status == 200
    results.append(check(
        "R7", "Item 6 demo detail page 200 (not 404)", r7,
        f"GET /task/{args.demo_order_id} -> HTTP {d_status}",
    ))

    # R8 — Item 9: X-402-Status wording
    # Re-fetch headers only for the manifest to read the response header.
    hdr_status, _ = fetch(f"{base}/api/market/x402-market")
    # urllib exposes headers via a second targeted request:
    x402_header = None
    try:
        req = urllib.request.Request(
            f"{base}/api/market/x402-market", headers={"User-Agent": "proof0-check/1.0"}
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            x402_header = resp.headers.get("X-402-Status")
    except Exception:  # noqa: BLE001
        x402_header = None
    r8 = x402_header in ("ACTIVE", "DISABLED")
    results.append(check(
        "R8", "Item 9 X-402-Status wording", r8,
        f"X-402-Status='{x402_header}' (must be ACTIVE or DISABLED)",
    ))

    # R9 — Item 3/6: llms.txt consistency
    llms_text = llms if isinstance(llms, str) else ""
    voucher_line_ok = bool(re.search(r"taskId.*sessionId|sessionId.*taskId", llms_text))
    r9 = ("DEMO_SETTLED" in llms_text) and voucher_line_ok
    results.append(check(
        "R9", "Item 3/6 llms.txt consistency", r9,
        f"mentions DEMO_SETTLED={'DEMO_SETTLED' in llms_text}; "
        f"voucher line has taskId+sessionId={voucher_line_ok}",
    ))

    passed = [r for r in results if r["pass"]]
    failed = [r for r in results if not r["pass"]]
    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "base": base,
        "demoOrderId": args.demo_order_id,
        "total": len(results),
        "passed": len(passed),
        "failed": len(failed),
        "gate": "PASS" if not failed else "FAIL",
        "checks": results,
    }
    if args.raw:
        summary["endpoints"] = {
            "x402-market": {"status": m_status, "body": manifest},
            "llms": {"status": l_status, "body": llms_text[:2000]},
            "capabilities": {"status": c_status, "body": caps},
            "health": {"status": h_status, "body": health},
            "demoDetail": {"status": d_status},
            "tasks": {"status": t_status, "body": tasks},
        }

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)

    # ── human-readable report ──
    print("════════════════════════════════════════════════════════")
    print(f" Proof 0 通行检查表 · base={base}")
    print(f" demo order = {args.demo_order_id}")
    print("════════════════════════════════════════════════════════")
    for r in results:
        mark = "✅" if r["pass"] else "❌"
        print(f"  {mark} {r['name']} [{r['item']}]")
        print(f"       {r['detail']}")
    print("────────────────────────────────────────────────────────")
    print(f"  {len(passed)}/9 passed · gate = {summary['gate']}")
    if args.out:
        print(f"  report -> {args.out}")
    print("════════════════════════════════════════════════════════")

    sys.exit(0 if not failed else 1)


if __name__ == "__main__":
    main()
