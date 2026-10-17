import paramiko, re

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

addr = "0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

cmd = (
    'curl -s --compressed --max-time 90 -H "User-Agent: ' + ua + '" '
    '-H "Accept: text/html" '
    'https://explorer.arc.io/address/' + addr + '?tab=contract -o /tmp/ct.html; '
    'wc -c /tmp/ct.html; '
    'grep -o -i "verified[^<\\"]\\{0,60\\}" /tmp/ct.html | sort -u | head -n 12'
)
stdin, stdout, stderr = client.exec_command(cmd, timeout=180)
print(stdout.read().decode('utf-8','ignore')[:1500])
client.close()
