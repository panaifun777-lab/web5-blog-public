import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=10)

# Check everything
checks = []

stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/', timeout=5)
checks.append(f'HTTP: {stdout.read().decode().strip()}')

stdin,stdout,stderr = client.exec_command("curl -s http://localhost:3000/ | grep -c 'ld+json'", timeout=5)
checks.append(f'JSON-LD: {"found" if stdout.read().decode().strip() != "0" else "missing"}')

stdin,stdout,stderr = client.exec_command('ls -la /root/web5-blog/public/rag-knowledge.json 2>/dev/null', timeout=5)
rag = stdout.read().decode().strip()
checks.append(f'RAG KB: {"exists" if rag else "missing"}')

stdin,stdout,stderr = client.exec_command('ls /root/web5-blog/public/logo.svg 2>/dev/null && echo "STILL EXISTS" || echo "REMOVED"', timeout=5)
checks.append(f'logo.svg: {stdout.read().decode().strip()}')

stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/favicon.svg', timeout=5)
checks.append(f'Favicon: {stdout.read().decode().strip()}')

for c in checks:
    print(c)

client.close()
