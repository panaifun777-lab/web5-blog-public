import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

addr = "0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

cmd = (
    'curl -s -o /tmp/resp2.txt -w "%{http_code}" --http2 --compressed --max-time 300 '
    '-H "User-Agent: ' + ua + '" '
    '-H "Accept: application/json, text/plain, */*" '
    '-H "Origin: https://explorer.arc.io" '
    '-H "Referer: https://explorer.arc.io/address/' + addr + '/contract-verification" '
    '-F "compiler_version=v0.8.24+commit.e11b9ed9" '
    '-F "license_type=none" '
    '-F "contract_name=WBOGToken" '
    '-F "autodetect_constructor_args=true" '
    '-F "constructor_args=" '
    '-F "files[0]=@/root/verify_payload.json;filename=standard-input.json;type=application/json" '
    'https://explorer.arc.io/api/v2/smart-contracts/' + addr + '/verification/via/standard-input'
)
stdin, stdout, stderr = client.exec_command(cmd, timeout=400)
print("HTTP", stdout.read().decode().strip())
stdin, stdout, stderr = client.exec_command('cat /tmp/resp2.txt')
print(stdout.read().decode('utf-8','ignore')[:2000])
client.close()
