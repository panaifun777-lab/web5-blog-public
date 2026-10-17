import paramiko, time, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

addr = "0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

cmd = (
    'curl -s --compressed --max-time 60 -H "User-Agent: ' + ua + '" '
    '-H "Accept: application/json" '
    'https://explorer.arc.io/api/v2/smart-contracts/' + addr
)
for attempt in range(12):
    time.sleep(10)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    body = stdout.read().decode('utf-8','ignore')
    if not body.startswith('{'):
        print(attempt, 'challenge/timeout', body[:80]); continue
    d = json.loads(body)
    print(attempt, 'is_verified=', d.get('is_verified'), '| name=', d.get('name'), '| status=', d.get('status'), '| compiler=', d.get('compiler_version'))
    if d.get('is_verified'):
        print('VERIFIED!')
        break
client.close()
