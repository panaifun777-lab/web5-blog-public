import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

addr = "0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
std_str = open('contracts/verify/WBOGToken_standard_input.json', encoding='utf-8').read()
std_obj = json.loads(std_str)

variants = {
  'v1_str_v': {"compiler_version": "v0.8.24+commit.e11b9ed9", "input": std_str},
  'v2_str_nov': {"compiler_version": "0.8.24+commit.e11b9ed9", "input": std_str},
  'v3_obj_v': {"compiler_version": "v0.8.24+commit.e11b9ed9", "input": std_obj},
  'v4_obj_nov': {"compiler_version": "0.8.24+commit.e11b9ed9", "input": std_obj},
}

sftp = client.open_sftp()
for name, payload in variants.items():
    with sftp.file('/root/vb_' + name + '.json', 'w') as f:
        f.write(json.dumps(payload))
sftp.close()

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
for name in variants:
    cmd = (
        'curl -s -o /tmp/r_' + name + '.txt -w "%{http_code}" --http2 --compressed --max-time 240 '
        '-H "User-Agent: ' + ua + '" '
        '-H "Accept: application/json, text/plain, */*" '
        '-H "Content-Type: application/json" '
        '-H "Origin: https://explorer.arc.io" '
        '-H "Referer: https://explorer.arc.io/address/' + addr + '/contract-verification" '
        '-X POST --data-binary @/root/vb_' + name + '.json '
        'https://explorer.arc.io/api/v2/smart-contracts/' + addr + '/verification/via/standard-input'
    )
    stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
    code = stdout.read().decode().strip()
    stdin, stdout, stderr = client.exec_command('cat /tmp/r_' + name + '.txt')
    body = stdout.read().decode('utf-8','ignore')
    print(name, '->', code, '|', body[:300].replace('\n',' '))
client.close()
