#!/usr/bin/env python3
import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=15)

# Deploy new files
print('[1/4] Deploying files...')
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; curl -sL https://paste.rs/8EKyw -o deploy-full.sh; bash deploy-full.sh', timeout=120)
out = stdout.read().decode()
print(out[-300:])

# Run RAG seed
print('[2/4] Seeding RAG knowledge base...')
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; node scripts/seed-rag.mjs', timeout=30)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
print(f'RAG: {out[:200]}')
if err: print(f'RAG ERR: {err[:200]}')

# Restart PM2
print('[3/4] Restarting PM2...')
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; pm2 restart web5-blog', timeout=10)
time.sleep(10)

# Verify
print('[4/4] Verifying...')
stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/', timeout=10)
http = stdout.read().decode().strip()

stdin,stdout,stderr = client.exec_command('ls -la /root/web5-blog/public/rag-knowledge.json 2>/dev/null', timeout=5)
rag = stdout.read().decode().strip()

stdin,stdout,stderr = client.exec_command('cat /root/web5-blog/public/rag-knowledge.json | wc -c', timeout=5)
size = stdout.read().decode().strip()

print(f'HTTP: {http} | RAG: {"exists" if rag else "missing"} ({size} bytes)')

# Also remove any old logo.svg again just in case
stdin,stdout,stderr = client.exec_command('rm -f /root/web5-blog/public/logo.svg', timeout=5)

client.close()
