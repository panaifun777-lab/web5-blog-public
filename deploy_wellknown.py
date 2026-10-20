import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

sftp = c.open_sftp()
sftp.put(r'C:\Users\Administrator\Desktop\Web5.blog\public\.well-known\agent.json',
         '/root/web5.blog/public/.well-known/agent.json')
sftp.put(r'C:\Users\Administrator\Desktop\Web5.blog\public\.well-known\x402-market.json',
         '/root/web5.blog/public/.well-known/x402-market.json')
sftp.close()
print('uploaded well-known artifacts')

stdin, stdout, stderr = c.exec_command('cd /root/web5.blog && pm2 restart web5-blog && sleep 4 && curl -s -o /dev/null -w "home=%{http_code}\\n" http://localhost:3000/ && curl -s http://localhost:3000/.well-known/x402-market.json | head -c 200 && echo "" && curl -s http://localhost:3000/.well-known/agent.json | head -c 160', timeout=60)
print(stdout.read().decode())
e = stderr.read().decode()
if e.strip():
    print('stderr:', e[:300])
c.close()
