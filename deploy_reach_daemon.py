import paramiko, os, time

HOST, PORT, USER, PASS = '38.55.146.192', 22, 'root', 'pshpBOOR8459'
REMOTE = '/root/web5.blog'
LOCAL = r'C:\Users\Administrator\Desktop\Web5.blog'

files = [
    'src/lib/web5/reach/crawler.ts',
    'src/lib/web5/reach/recommender.ts',
    'src/lib/web5/daemon/agent-daemon.ts',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, PORT, USER, PASS, timeout=20)

sftp = c.open_sftp()
for f in files:
    sftp.put(os.path.join(LOCAL, f.replace('/', os.sep)), f'{REMOTE}/{f}')
    print('uploaded', f)
sftp.close()

stdin, stdout, stderr = c.exec_command(f'cd {REMOTE} && pm2 restart web5-blog', timeout=60)
print(stdout.read().decode()[:300])

for i in range(20):
    stdin, stdout, stderr = c.exec_command('curl -s -o /dev/null -w "%{http_code}" -m 5 http://localhost:3000/')
    if stdout.read().decode().strip() == '200':
        print('ready after', i * 3, 's'); break
    time.sleep(3)

print('\n--- daemon health ---')
stdin, stdout, stderr = c.exec_command('curl -s -m 10 http://localhost:3000/api/daemon/health', timeout=30)
print(stdout.read().decode()[:600])

print('\n--- trigger daemon tick (crawl pipeline) ---')
stdin, stdout, stderr = c.exec_command('curl -s -m 90 -X POST http://localhost:3000/api/autonomous/tick', timeout=120)
print(stdout.read().decode()[:500])

print('\n--- reach logs ---')
stdin, stdout, stderr = c.exec_command("pm2 logs web5-blog --lines 40 --nostream 2>&1 | grep -i 'Reach' | tail -6")
print(stdout.read().decode())

print('\n--- opportunity count ---')
stdin, stdout, stderr = c.exec_command('curl -s -m 15 "http://localhost:3000/api/reach/opportunities?limit=1"', timeout=30)
import json
d = json.loads(stdout.read().decode())
print('total opportunities:', d.get('total'))

c.close()
