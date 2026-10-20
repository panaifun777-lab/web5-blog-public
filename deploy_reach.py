import paramiko, os, time

HOST, PORT, USER, PASS = '38.55.146.192', 22, 'root', 'pshpBOOR8459'
REMOTE = '/root/web5.blog'
LOCAL = r'C:\Users\Administrator\Desktop\Web5.blog'

files = [
    'prisma/schema.prisma',
    'src/lib/web5/reach/crawler.ts',
    'src/lib/web5/reach/recommender.ts',
    'src/lib/web5/reach/radar.ts',
    'src/app/api/reach/crawl/route.ts',
    'src/app/api/reach/opportunities/route.ts',
    'src/components/web5/reach/opportunity-radar.tsx',
    'src/components/web5/commerce/task-board.tsx',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, PORT, USER, PASS, timeout=20)

sftp = c.open_sftp()
print('[1/4] upload')
for f in files:
    lp = os.path.join(LOCAL, f.replace('/', os.sep))
    rp = f'{REMOTE}/{f}'
    d = os.path.dirname(rp)
    try:
        sftp.stat(d)
    except IOError:
        c.exec_command(f"mkdir -p '{d}'"); time.sleep(0.2)
    sftp.put(lp, rp)
    print('  ->', f)
sftp.close()

print('\n[2/4] prisma db push + generate')
stdin, stdout, stderr = c.exec_command(
    f'cd {REMOTE} && npx prisma db push --skip-generate && npx prisma generate', timeout=180)
print(stdout.read().decode()[-800:])

print('\n[3/4] restart')
stdin, stdout, stderr = c.exec_command(f'cd {REMOTE} && pm2 restart web5-blog', timeout=60)
print(stdout.read().decode())

# wait ready
for i in range(20):
    stdin, stdout, stderr = c.exec_command('curl -s -o /dev/null -w "%{http_code}" -m 5 http://localhost:3000/')
    if stdout.read().decode().strip() == '200':
        print('ready after', i * 3, 's'); break
    time.sleep(3)

print('\n[4/4] live crawl test')
stdin, stdout, stderr = c.exec_command(
    'curl -s -m 90 -X POST http://localhost:3000/api/reach/crawl -H "Content-Type: application/json" -d \'{"limit":10}\'',
    timeout=120)
print(stdout.read().decode()[:1200])

stdin, stdout, stderr = c.exec_command(
    'curl -s -m 20 "http://localhost:3000/api/reach/opportunities?limit=3"', timeout=40)
print('\n--- opportunities ---')
print(stdout.read().decode()[:900])

c.close()
