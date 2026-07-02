import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=10)

# Get ALL CSS URLs from HTML
stdin,stdout,stderr = client.exec_command('curl -s http://localhost:3000/ | head -200', timeout=10)
html = stdout.read().decode()

# Look for any logo, image, or SVG references
import re
for match in re.finditer(r'<img[^>]*>|<svg[^>]*>|\.(png|svg|ico|webp)[\'"]|url\([^)]*\)', html):
    ctx = html[max(0,match.start()-80):match.end()+80]
    print(ctx.strip()[:200])
    print('---')

# Also check for any fixed/bottom positioned elements
for match in re.finditer(r'fixed|absolute|bottom-0|bottom-1|left-0|left-1', html):
    line = html[max(0,match.start()-50):match.end()+200]
    print(f"Found layout: {line.strip()[:250]}")
    print('---')

client.close()
