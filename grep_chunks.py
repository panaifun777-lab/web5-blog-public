import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
addr = "0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
cmd = (
    'curl -s --compressed -H "User-Agent: ' + ua + '" '
    'https://explorer.arc.io/address/' + addr + '/contract-verification -o /tmp/page.html; '
    'grep -o "/_next/static/chunks/[a-zA-Z0-9._/-]*\\.js" /tmp/page.html | sort -u | head -n 60'
)
stdin, stdout, stderr = client.exec_command(cmd, timeout=180)
print(stdout.read().decode('utf-8','ignore'))
client.close()
