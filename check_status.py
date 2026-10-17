import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

addr = "0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

cmd = (
    'curl -s --compressed --max-time 60 '
    '-H "User-Agent: ' + ua + '" '
    '-H "Accept: application/json, text/plain, */*" '
    '-H "sec-ch-ua: \\"Chromium\\";v=\\"141\\", \\"Not?A_Brand\\";v=\\"24\\"" '
    '-H "sec-ch-ua-mobile: ?0" -H "sec-ch-ua-platform: \\"Windows\\"" '
    '-H "Referer: https://explorer.arc.io/address/' + addr + '" '
    'https://explorer.arc.io/api/v2/smart-contracts/' + addr
)
stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
d = json.loads(stdout.read().decode('utf-8','ignore'))
print('is_verified:', d.get('is_verified'))
print('is_partially_verified:', d.get('is_partially_verified'))
print('is_changed_bytecode:', d.get('is_changed_bytecode'))
print('name:', d.get('name'))
print('compiler:', d.get('compiler_version'))
print('verified_at:', d.get('verified_at'))
print('license:', d.get('license_type'))
print('source_code len:', len(d.get('source_code') or ''))
client.close()
