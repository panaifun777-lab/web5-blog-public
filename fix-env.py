import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=10)

# Read datasource block from schema.prisma
stdin,stdout,stderr = client.exec_command('grep -i -A3 "datasource" /root/web5-blog/prisma/schema.prisma', timeout=5)
print('DATASOURCE:', stdout.read().decode().strip())

# Check the full datasource
stdin,stdout,stderr = client.exec_command('grep -i "datasource\\|url\\|provider" /root/web5-blog/prisma/schema.prisma | head -10', timeout=5)
print('URL:', stdout.read().decode().strip())

# Add DATABASE_URL to .env
db_url = 'file:../db/prod.db'
stdin,stdout,stderr = client.exec_command(f'echo DATABASE_URL={db_url} >> /root/web5-blog/.env', timeout=5)
print('Added DATABASE_URL')

# Verify
stdin,stdout,stderr = client.exec_command('cat /root/web5-blog/.env', timeout=5)
print('ENV:', stdout.read().decode().strip())

client.close()
