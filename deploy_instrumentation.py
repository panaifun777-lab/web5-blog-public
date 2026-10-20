import paramiko, time, json

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

sftp = c.open_sftp()
sftp.put(r'C:\Users\Administrator\Desktop\Web5.blog\src\instrumentation.ts',
         '/root/web5.blog/src/instrumentation.ts')
sftp.close()
print('uploaded instrumentation.ts')

stdin, stdout, stderr = c.exec_command('cd /root/web5.blog && pm2 restart web5-blog', timeout=60)
print(stdout.read().decode()[:200])

for i in range(20):
    stdin, stdout, stderr = c.exec_command('curl -s -o /dev/null -w "%{http_code}" -m 5 http://localhost:3000/')
    if stdout.read().decode().strip() == '200':
        print('ready after', i * 3, 's')
        break
    time.sleep(3)

print('\n--- check daemon start log ---')
stdin, stdout, stderr = c.exec_command(
    "pm2 logs web5-blog --lines 60 --nostream 2>&1 | grep -iE 'instrumentation|daemon started|Headless Daemon' | tail -5")
print(stdout.read().decode() or '(no daemon log yet)')

print('\n--- wait 75s for first daemon tick ---')
time.sleep(75)

stdin, stdout, stderr = c.exec_command(
    "pm2 logs web5-blog --lines 100 --nostream 2>&1 | grep -iE 'Reach|daemon started' | tail -6")
print(stdout.read().decode() or '(no reach log)')

print('\n--- opportunity total ---')
stdin, stdout, stderr = c.exec_command('curl -s -m 15 "http://localhost:3000/api/reach/opportunities?limit=1"', timeout=30)
txt = stdout.read().decode()
try:
    print('total:', json.loads(txt).get('total'))
except Exception:
    print(txt[:200])

c.close()
