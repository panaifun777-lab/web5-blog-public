import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=10)

# Get the HTML source and check for logos
stdin,stdout,stderr = client.exec_command("curl -s http://localhost:3000/", timeout=10)
html = stdout.read().decode()
# Search for any logo or z.ai related content
import re
matches = []
for line in html.split('\n'):
    if any(x in line.lower() for x in ['logo', 'z.ai', 'zeus', 'z-ai', 'brand', 'watermark']):
        matches.append(line.strip()[:200])

print("Z.ai/logo references found:", len(matches))
for m in matches[:15]:
    print(f"  {m}")

# Check if logo.svg is accessible
import urllib.request
try:
    resp = urllib.request.urlopen("http://154.9.26.108:3000/logo.svg", timeout=5)
    print(f"\n/logo.svg accessible: {resp.status} ({len(resp.read())} bytes)")
except Exception as e:
    print(f"\n/logo.svg NOT accessible: {e}")

# Check the favicon
try:
    resp = urllib.request.urlopen("http://154.9.26.108:3000/favicon.ico", timeout=5)
    print(f"/favicon.ico: {resp.status} ({len(resp.read())} bytes)")
except Exception as e:
    print(f"/favicon.ico: {e}")

client.close()
