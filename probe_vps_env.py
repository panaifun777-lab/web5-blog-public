import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

cmds = [
    'cat /etc/os-release | head -n 2',
    'node -v; npm -v',
    'which chromium chromium-browser google-chrome 2>/dev/null; ls /root/.cache/ms-playwright 2>/dev/null',
    'free -m | head -n 2',
    'df -h / | tail -n 1',
]
for c in cmds:
    stdin, stdout, stderr = client.exec_command(c)
    print('>>>', c)
    print(stdout.read().decode('utf-8','ignore').strip())
    print('---')
client.close()
