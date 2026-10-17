
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
}

def get(url, tries=10, delay=5):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=HDRS)
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, r.read().decode("utf-8","ignore")
        except urllib.error.HTTPError as e:
            b = e.read().decode("utf-8","ignore")
            if e.code in (403,429,503) or "Just a moment" in b:
                time.sleep(delay); continue
            return e.code, b[:300]
        except Exception as e:
            time.sleep(delay)
    return None, "timeout"

for path in [
    "/api/v2/smart-contracts/" + ADDR + "/verification/config",
    "/api/v2/smart-contracts/" + ADDR,
]:
    st, body = get(BASE + path)
    print("PATH", path, "STATUS", st)
    print(body[:600])
    print("---")
