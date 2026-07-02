import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=10)

stdin,stdout,stderr = client.exec_command('head -c 500 /root/web5-blog/public/rag-knowledge.json', timeout=5)
print('CONTENT:', stdout.read().decode()[:500])

# Check if it's valid JSON and count
stdin,stdout,stderr = client.exec_command('node -e "const d=require(\"/root/web5-blog/public/rag-knowledge.json\");console.log(\"Entries:\"+d.length)"', timeout=5)
print('NODE:', stdout.read().decode()[:200])

client.close()
