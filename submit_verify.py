import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

addr = "0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
std = open('contracts/verify/WBOGToken_standard_input.json', encoding='utf-8').read()

body = {
    "compiler_version": "v0.8.24+commit.e11b9ed9",
    "contract_name": "WBOGToken",
    "input": std,
    "autodetect_constructor_args": True,
}

sftp = client.open_sftp()
with sftp.file('/root/verify_body.json', 'w') as f:
    f.write(json.dumps(body))
sftp.close()

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
cmd = (
    'curl -s -o /tmp/resp.txt -w "%{http_code}" --http2 --compressed --max-time 180 '
    '-H "User-Agent: ' + ua + '" '
    '-H "Accept: application/json, text/plain, */*" '
    '-H "Content-Type: application/json" '
    '-H "Origin: https://explorer.arc.io" '
    '-H "Referer: https://explorer.arc.io/address/' + addr + '/contract-verification" '
    '-X POST --data-binary @/root/verify_body.json '
    'https://explorer.arc.io/api/v2/smart-contracts/' + addr + '/verification/via/standard-input'
)
stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
print("HTTP", stdout.read().decode().strip())
stdin, stdout, stderr = client.exec_command('cat /tmp/resp.txt')
print(stdout.read().decode('utf-8','ignore')[:2000])
client.close()
