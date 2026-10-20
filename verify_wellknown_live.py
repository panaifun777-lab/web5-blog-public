import paramiko, time

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

for i in range(15):
    stdin, stdout, stderr = c.exec_command('curl -s -o /dev/null -w "%{http_code}" -m 5 http://localhost:3000/')
    code = stdout.read().decode().strip()
    if code == '200':
        print('server ready after', i * 3, 's')
        break
    time.sleep(3)

cmd = """
for p in /.well-known/agent.json /.well-known/x402-market.json /llms.txt /api/openapi.json; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -m 8 "http://localhost:3000$p")
  echo "$p -> $code"
done
echo '--- x402 head ---'
curl -s -m 8 http://localhost:3000/.well-known/x402-market.json | head -c 240
"""
stdin, stdout, stderr = c.exec_command(cmd, timeout=90)
print(stdout.read().decode())
c.close()
