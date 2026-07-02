#!/usr/bin/env python3
import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=15)

# Read .env from local
with open(r'C:\Users\Administrator\Desktop\Web5.blog\.env', 'r') as f:
    env_content = f.read()

# Write .env to VPS via SSH
stdin,stdout,stderr = client.exec_command('cat > /root/web5-blog/.env', timeout=10)
stdin.write(env_content)
stdin.close()
print('ENV: sent securely')

# Verify
stdin,stdout,stderr = client.exec_command('head -5 /root/web5-blog/.env', timeout=5)
v = stdout.read().decode()[:80]
print(f'Verify: {v}')

# Deploy
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; curl -sL https://paste.rs/GLQ6F -o deploy-full.sh; bash deploy-full.sh; pm2 restart web5-blog', timeout=90)
time.sleep(25)

# Check results
stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/', timeout=10)
http = stdout.read().decode().strip()

stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/favicon.svg', timeout=5)
fav = stdout.read().decode().strip()

stdin,stdout,stderr = client.exec_command("curl -s http://localhost:3000/ | grep -c 'ld+json'", timeout=5)
ld = stdout.read().decode().strip()
ld_status = 'found' if ld != '0' else 'missing'

print(f'HTTP: {http} | FAVICON: {fav} | JSON-LD: {ld_status}')

client.close()
