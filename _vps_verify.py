
import json, time, urllib.request, urllib.error

ADDR = "0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
BASE = "https://explorer.arc.io"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
HDRS = {
    "User-Agent": UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "sec-ch-ua": '"Chromium";v="141", "Not?A_Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Origin": BASE,
    "Referer": BASE + "/address/" + ADDR + "/contract-verification",
}

def call(url, data=None, tries=8, delay=6):
    last = None
    for i in range(tries):
        req = urllib.request.Request(url, data=data, headers=HDRS, method="POST" if data else "GET")
        if data:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read().decode("utf-8", "ignore")
                return r.status, body
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "ignore")
            last = (e.code, body[:200])
            if "Just a moment" in body or e.code in (403, 429, 503):
                time.sleep(delay)
                continue
            return e.code, body
        except Exception as e:
            last = ("ERR", str(e))
            time.sleep(delay)
    return last if last else (None, "")

std = open("/root/verify_payload.json", encoding="utf-8").read()
payload = json.dumps({
    "compiler_version": "v0.8.24+commit.e11b9ed9",
    "input": std,
    "autodetect_constructor_args": True,
}).encode()

url = BASE + "/api/v2/smart-contracts/" + ADDR + "/verification/via/solidity-standard-json-input"
st, body = call(url, payload)
print("STATUS", st)
print("BODY", body[:2000])
