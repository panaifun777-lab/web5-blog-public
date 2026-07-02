#!/usr/bin/env python3
import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=15)

# Deploy + restart
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; curl -sL https://paste.rs/riyjO -o deploy-full.sh; bash deploy-full.sh; pm2 restart web5-blog', timeout=90)
time.sleep(25)

# Check status
stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/', timeout=10)
http = stdout.read().decode().strip()
print(f'HTTP: {http}')

if http != '200':
    stdin,stdout,stderr = client.exec_command("curl -s http://localhost:3000/ 2>/dev/null | head -20", timeout=10)
    err = stdout.read().decode()[:500]
    # Try to find error message
    import re
    m = re.search(r'error[^<]*>[^<]+', err, re.I)
    print(f'ERR: {m.group(0)[:200] if m else err[:200]}')

# Check favicon
stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/favicon.svg', timeout=5)
favicon = stdout.read().decode().strip()
print(f'favicon.svg: {favicon}')

client.close()
