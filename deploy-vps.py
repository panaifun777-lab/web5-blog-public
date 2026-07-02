#!/usr/bin/env python3
import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=15)

# Step 1: Send .env
print('[1/5] Sending .env...')
with open(r'C:\Users\Administrator\Desktop\Web5.blog\.env', 'r') as f:
    env_content = f.read()
stdin,stdout,stderr = client.exec_command('cat > /root/web5-blog/.env', timeout=10)
stdin.write(env_content)
stdin.close()

# Step 2: Deploy new files
print('[2/5] Deploying files...')
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; curl -sL https://paste.rs/pC97a -o deploy-full.sh; bash deploy-full.sh', timeout=120)
stdout_data, stderr_data = stdout.read(), stderr.read()
print(stdout_data.decode()[-200:])
if stderr_data: print('ERR:', stderr_data.decode()[:200])

# Step 3: Run RAG seed
print('[3/5] Seeding RAG knowledge base...')
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; node scripts/seed-rag.mjs', timeout=30)
stdout_data = stdout.read().decode().strip()
stderr_data = stderr.read().decode().strip()
print(f'RAG seed: {stdout_data}')
if stderr_data: print(f'RAG err: {stderr_data[:200]}')

# Step 4: Restart PM2
print('[4/5] Restarting PM2...')
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; pm2 restart web5-blog', timeout=10)
time.sleep(10)

# Step 5: Verify
print('[5/5] Verifying...')
stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/', timeout=10)
http = stdout.read().decode().strip()

stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/favicon.svg', timeout=5)
fav = stdout.read().decode().strip()

stdin,stdout,stderr = client.exec_command("curl -s http://localhost:3000/ | grep -c 'ld+json'", timeout=5)
ld_count = stdout.read().decode().strip()

stdin,stdout,stderr = client.exec_command("curl -s -o /dev/null -w '%{size_download}' http://localhost:3000/rag-knowledge.json", timeout=5)
rag_size = stdout.read().decode().strip()

print(f'HTTP: {http}')
print(f'FAVICON: {fav}')
print(f'JSON-LD: {"found" if ld_count != "0" else "missing"}')
print(f'RAG KB: {rag_size} bytes')

client.close()
