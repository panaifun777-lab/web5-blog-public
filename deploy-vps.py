#!/usr/bin/env python3
import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=15)

# Deploy + restart
stdin,stdout,stderr = client.exec_command('cd /root/web5-blog; curl -sL https://paste.rs/WhXxQ -o deploy-full.sh; bash deploy-full.sh; pm2 restart web5-blog', timeout=90)
time.sleep(25)

# Check status
stdin,stdout,stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/', timeout=10)
http = stdout.read().decode().strip()
print(f'HTTP: {http}')

if http != '200':
    # Get error
    stdin,stdout,stderr = client.exec_command('curl -s http://localhost:3000/ 2>/dev/null | grep -oP "message[^;]*" | head -3', timeout=10)
    print('ERR:', stdout.read().decode()[:300])

client.close()
