import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=10)

stdin,stdout,stderr = client.exec_command('ls -la /root/web5-blog/public/', timeout=5)
print('FILES:', stdout.read().decode())

stdin,stdout,stderr = client.exec_command('ls -la /root/web5-blog/scripts/', timeout=5)
print('SCRIPTS:', stdout.read().decode())

stdin,stdout,stderr = client.exec_command('ls -la /root/web5-blog/rag-knowledge.json 2>/dev/null; find /root/web5-blog -name "rag-knowledge*" 2>/dev/null', timeout=5)
print('RAG:', stdout.read().decode())

stdin,stdout,stderr = client.exec_command('cat /root/web5-blog/.env 2>/dev/null', timeout=5)
print('ENV:', stdout.read().decode()[:200])

client.close()
