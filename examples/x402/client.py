"""Minimal x402 prepaid client for Web5.blog.

deps: pip install requests eth-account
usage:
  WEB5_KEY=0x... python examples/x402/client.py balance
  WEB5_KEY=0x... python examples/x402/client.py register
  WEB5_KEY=0x... python examples/x402/client.py deposit <txHash>
  WEB5_KEY=0x... python examples/x402/client.py fetch <arweaveHash> [--deep]
"""

import base64
import json
import os
import sys
import time

import requests
from eth_account import Account
from eth_account.messages import encode_defunct, encode_typed_data

BASE_URL = os.environ.get("WEB5_BASE_URL", "https://web5.blog")
KEY = os.environ.get("WEB5_KEY", "")
BUDGET_FENCE = os.environ.get(
    "WEB5_BUDGET_FENCE", "0xe0d246c09d7a3097bab3148f89201157dd531eea"
)

if not KEY.startswith("0x") or len(KEY) != 66:
    raise SystemExit("Set WEB5_KEY to a 0x-prefixed private key")

account = Account.from_key(KEY)
address = account.address.lower()


def register() -> None:
    nonce = int(time.time() * 1000)
    deadline = int(time.time()) + 3600
    message = "\n".join(
        [
            "Web5.blog x402 Prepaid Wallet Registration",
            "",
            f"Address: {address}",
            f"Nonce: {nonce}",
            f"Deadline: {deadline}",
            "",
            "This signature registers a prepaid wallet. It does not move funds or authorize a payment.",
        ]
    )
    signature = Account.sign_message(encode_defunct(text=message), KEY).signature.hex()
    if not signature.startswith("0x"):
        signature = "0x" + signature
    res = requests.post(
        f"{BASE_URL}/api/x402/register",
        json={
            "address": account.address,
            "nonce": str(nonce),
            "deadline": str(deadline),
            "signature": signature,
        },
        timeout=30,
    )
    print("register", res.status_code, res.text)


def balance() -> None:
    res = requests.get(
        f"{BASE_URL}/api/x402/balance",
        params={"address": account.address},
        timeout=30,
    )
    print("balance", res.status_code, res.text)


def deposit(tx_hash: str) -> None:
    res = requests.post(
        f"{BASE_URL}/api/x402/deposits",
        json={"txHash": tx_hash, "address": account.address},
        timeout=60,
    )
    print("deposit", res.status_code, res.text)


def resolve_author_did(arweave_hash: str) -> str:
    configured = os.environ.get("WEB5_AUTHOR_DID")
    if configured:
        return configured
    res = requests.get(
        f"{BASE_URL}/api/content/detail",
        params={"hash": arweave_hash},
        timeout=30,
    )
    payload = res.json()
    return payload["content"]["authorDid"]


def fetch(arweave_hash: str, deep: bool = False) -> None:
    price = "0.05" if deep else "0.03"
    voucher = {
        "contentId": arweave_hash,
        "authorDid": resolve_author_did(arweave_hash),
        "amountUsdc": price,
        "nonce": int(time.time() * 1000),
        "timestamp": int(time.time() * 1000),
        "signerAddress": account.address,
    }
    signable = encode_typed_data(
        domain_data={
            "name": "Web5.blog AP2 Voucher Gateway",
            "version": "1.0",
            "chainId": 5042,
            "verifyingContract": BUDGET_FENCE,
        },
        message_types={
            "Web5SessionVoucher": [
                {"name": "contentId", "type": "string"},
                {"name": "authorDid", "type": "string"},
                {"name": "amountUsdc", "type": "string"},
                {"name": "nonce", "type": "uint256"},
                {"name": "timestamp", "type": "uint256"},
            ]
        },
        message_data={
            "contentId": voucher["contentId"],
            "authorDid": voucher["authorDid"],
            "amountUsdc": voucher["amountUsdc"],
            "nonce": voucher["nonce"],
            "timestamp": voucher["timestamp"],
        },
    )
    signature = Account.sign_message(signable, KEY).signature.hex()
    if not signature.startswith("0x"):
        signature = "0x" + signature
    voucher["signature"] = signature

    header = base64.urlsafe_b64encode(
        json.dumps(voucher, separators=(",", ":")).encode()
    ).rstrip(b"=").decode()

    res = requests.get(
        f"{BASE_URL}/api/content/detail",
        params={"hash": arweave_hash, "agent": "true", **({"deep": "true"} if deep else {})},
        headers={
            "Accept": "application/vnd.x402+json",
            "X-402-Payment-Authorization": f"Web5-Voucher {header}",
        },
        timeout=30,
    )
    print("fetch", res.status_code, res.text[:2000])


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "register":
        register()
    elif command == "balance":
        balance()
    elif command == "deposit" and len(sys.argv) > 2:
        deposit(sys.argv[2])
    elif command == "fetch" and len(sys.argv) > 2:
        fetch(sys.argv[2], "--deep" in sys.argv)
    else:
        print(__doc__)
