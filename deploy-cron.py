#!/usr/bin/env python3
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=15)

stdin, stdout, stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/', timeout=10)
http_code = stdout.read().decode().strip()
print(f'HTTP: {http_code}')

stdin, stdout, stderr = client.exec_command('(crontab -l 2>/dev/null; echo "*/5 * * * * curl -s -X POST http://localhost:3000/api/autonomous/tick -o /dev/null") | crontab -', timeout=10)
print('CRON:', stdout.read().decode().strip() or 'added')

stdin, stdout, stderr = client.exec_command('crontab -l 2>/dev/null | tail -5', timeout=5)
print('CRONTAB LAST:')
for line in stdout.read().decode().strip().split('\n')[-3:]:
    print(f'  {line}')

client.close()
print('DONE')
