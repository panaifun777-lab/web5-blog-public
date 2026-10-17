import paramiko, time, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

addr = "0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

cmd = (
    'curl -s --compressed --max-time 60 '
    '-H "User-Agent: ' + ua + '" '
    '-H "Accept: application/json, text/plain, */*" '
    '-H "Accept-Language: en-US,en;q=0.9" '
    '-H "sec-ch-ua: \\"Chromium\\";v=\\"141\\", \\"Not?A_Brand\\";v=\\"24\\"" '
    '-H "sec-ch-ua-mobile: ?0" '
    '-H "sec-ch-ua-platform: \\"Windows\\"" '
    '-H "sec-fetch-dest: empty" -H "sec-fetch-mode: cors" -H "sec-fetch-site: same-origin" '
    '-H "Referer: https://explorer.arc.io/address/' + addr + '" '
    'https://explorer.arc.io/api/v2/smart-contracts/' + addr
)
stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
body = stdout.read().decode('utf-8','ignore')
print('len', len(body))
print(body[:300])
client.close()
