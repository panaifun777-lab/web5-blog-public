#!/usr/bin/env python3
import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=15)

# Deploy + restart
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; curl -sL https://paste.rs/ZmCy8 -o deploy-full.sh; bash deploy-full.sh; pm2 restart web5-blog', timeout=60)
time.sleep(20)

# Check status
stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/', timeout=10)
http = stdout.read().decode().strip()
print(f'HTTP: {http}')

# Check crontab
stdin,stdout,stderr = client.exec_command('crontab -l 2>/dev/null | grep autonomous', timeout=5)
cron = stdout.read().decode().strip()
print(f'CRON: {cron[:80] if cron else "NOT FOUND"}')

client.close()
print('DONE')
