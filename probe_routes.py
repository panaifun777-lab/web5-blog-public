import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
addr = "0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f"
paths = ["standard-input", "solidity-standard-json-input", "flattened-code"]

for p in paths:
    cmd = (
        'curl -s -o /tmp/r.txt -w "%{http_code}" --http2 --compressed '
        '-H "User-Agent: ' + ua + '" '
        '-H "Accept: application/json, text/plain, */*" '
        '-H "Content-Type: application/json" '
        '-H "Origin: https://explorer.arc.io" '
        '-H "Referer: https://explorer.arc.io/address/' + addr + '/contract-verification" '
        '-X POST --data "{}" '
        'https://explorer.arc.io/api/v2/smart-contracts/' + addr + '/verification/via/' + p
    )
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    code = stdout.read().decode().strip()
    stdin, stdout, stderr = client.exec_command('head -c 250 /tmp/r.txt')
    body = stdout.read().decode('utf-8','ignore')
    print(p, '->', code, '|', body.replace('\n',' ')[:200])
client.close()
