import paramiko, time, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

addr = "0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

cmd = (
    'curl -s --http2 --compressed --max-time 300 '
    '-H "User-Agent: ' + ua + '" '
    '-H "Accept: application/json, text/plain, */*" '
    '-H "Origin: https://explorer.arc.io" '
    '-H "Referer: https://explorer.arc.io/address/' + addr + '/contract-verification" '
    '-F "compiler_version=v0.8.24+commit.e11b9ed9" '
    '-F "license_type=mit" '
    '-F "contract_name=WBOGToken" '
    '-F "autodetect_constructor_args=true" '
    '-F "constructor_args=" '
    '-F "files[0]=@/root/verify_payload.json;filename=standard-input.json;type=application/json" '
    'https://explorer.arc.io/api/v2/smart-contracts/' + addr + '/verification/via/standard-input'
)
stdin, stdout, stderr = client.exec_command(cmd, timeout=400)
print('SUBMIT', stdout.read().decode('utf-8','ignore')[:300])

time.sleep(15)

cmd2 = (
    'curl -s --compressed --max-time 60 '
    '-H "User-Agent: ' + ua + '" '
    '-H "Accept: application/json, text/plain, */*" '
    '-H "sec-ch-ua: \\"Chromium\\";v=\\"141\\", \\"Not?A_Brand\\";v=\\"24\\"" '
    '-H "sec-ch-ua-mobile: ?0" -H "sec-ch-ua-platform: \\"Windows\\"" '
    '-H "Referer: https://explorer.arc.io/address/' + addr + '" '
    'https://explorer.arc.io/api/v2/smart-contracts/' + addr
)
stdin, stdout, stderr = client.exec_command(cmd2, timeout=120)
body = stdout.read().decode('utf-8','ignore')
if body.strip().startswith('{'):
    d = json.loads(body)
    print('verified:', d.get('is_verified'), '| license:', d.get('license_type'), '| partial:', d.get('is_partially_verified'))
else:
    print('challenge on check')
client.close()
