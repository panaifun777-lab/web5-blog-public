import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=10)

# Run RAG seed
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog && node scripts/seed-rag.mjs', timeout=30)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
print('OUTPUT:', out)
if err: print('ERROR:', err[:500])

# Check generated file
stdin,stdout,stderr = client.exec_command('ls -la /root/web5-blog/public/rag-knowledge.json 2>/dev/null', timeout=5)
print('FILE:', stdout.read().decode().strip())

# Count entries
stdin,stdout,stderr = client.exec_command('cat /root/web5-blog/public/rag-knowledge.json | node -e "process.stdin.resume();let d=\"\";process.stdin.on(\"data\",c=>d+=c);process.stdin.on(\"end\",()=>{try{console.log(JSON.parse(d).length+\" entries\")}catch(e){console.log(\"parse error\")}})"', timeout=5)
print('COUNT:', stdout.read().decode().strip())

client.close()
