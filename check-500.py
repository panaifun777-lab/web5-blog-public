#!/usr/bin/env python3
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('154.9.26.108', 22, 'root', 'RJxjLiP9tB4f', timeout=15)

stdin,stdout,stderr = client.exec_command('curl -s http://localhost:3000/ 2>/dev/null | grep -o "message[^;]*" | head -5', timeout=10)
print('PAGE:', stdout.read().decode()[:500])
print()

stdin,stdout,stderr = client.exec_command('ls /root/web5-blog/src/components/web5/i18n/language-switcher.tsx 2>/dev/null && echo "EXISTS"', timeout=5)
print('LS:', stdout.read().decode())

client.close()
