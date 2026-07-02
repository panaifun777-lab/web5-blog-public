#!/usr/bin/env python3
import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=15)

print('[1/5] Deploying files...')
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; curl -sL https://paste.rs/uMYGJ -o deploy-full.sh; bash deploy-full.sh', timeout=120)
out = stdout.read().decode()
print(out[-200:])

print('[2/5] Seeding RAG KB (keywords + vectors)...')
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; node scripts/seed-rag.mjs', timeout=30)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
print(f'RAG: {out}')
if err: print(f'ERR: {err[:200]}')

print('[3/5] Restarting PM2...')
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog && pm2 restart web5-blog', timeout=10)
time.sleep(10)

print('[4/5] Verifying...')
stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/', timeout=15)
http = stdout.read().decode().strip()

stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/logo.svg', timeout=5)
logo = stdout.read().decode().strip()

stdin,stdout,stderr = client.exec_command('wc -c /root/web5-blog/public/rag-knowledge.json 2>/dev/null', timeout=5)
rag = stdout.read().decode().strip()

stdin,stdout,stderr = client.exec_command("curl -s http://localhost:3000/ | grep -c 'ld+json'", timeout=5)
ld = stdout.read().decode().strip()

print(f'HTTP: {http}')
print(f'/logo.svg: {logo}')
print(f'RAG KB: {rag}')
print(f'JSON-LD: {ld}')

client.close()
