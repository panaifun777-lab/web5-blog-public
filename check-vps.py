import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=10)

# Remove old z.ai logo from VPS
stdin,stdout,stderr = client.exec_command('rm -f /root/web5-blog/public/logo.svg && echo logo.svg deleted', timeout=5)
print(stdout.read().decode().strip())

# Check database
stdin,stdout,stderr = client.exec_command('head -30 /root/web5-blog/prisma/schema.prisma', timeout=5)
print('PRISMA:', stdout.read().decode()[:300])

# Check DB files
stdin,stdout,stderr = client.exec_command('find /root/web5-blog -name "*.db" -type f 2>/dev/null', timeout=5)
print('DB files:', stdout.read().decode().strip()[:300])

# Check environment for DATABASE_URL
stdin,stdout,stderr = client.exec_command('cat /root/web5-blog/.env 2>/dev/null', timeout=5)
print('ENV:', stdout.read().decode().strip()[:500])

client.close()
