import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

cmds = [
    'curl -s -o /dev/null -w "%{http_code}" https://explorer.arc.io/api/v2/smart-contracts/0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f',
    'curl -s https://explorer.arc.io/api/v2/smart-contracts/0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f | head -c 400',
]
for c in cmds:
    stdin, stdout, stderr = client.exec_command(c)
    print('>>>', c)
    print(stdout.read().decode('utf-8', 'ignore'))
    print('---')
client.close()
