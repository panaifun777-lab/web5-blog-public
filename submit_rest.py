import paramiko, json, subprocess, os, time

names = ['ContentNFT', 'BudgetFence', 'VesselAuth']
os.makedirs('contracts/verify', exist_ok=True)

# 1) generate standard json inputs locally
for n in names:
    out = subprocess.run(
        ['forge', 'inspect', 'contracts/%s.sol:%s' % (n, n), 'standardJson'],
        cwd='contracts', capture_output=True)
    raw = out.stdout
    text = None
    for enc in ('utf-8', 'utf-16'):
        try:
            cand = raw.decode(enc)
            idx = cand.find('{') if '{' in cand else cand.find('{'.encode().decode())
            if '{' in cand:
                json.loads(cand[cand.find('{'):])
                text = cand
                break
        except Exception:
            continue
    if text is None:
        raise SystemExit('cannot decode standardJson for ' + n)
    d = json.loads(text[text.find('{'):])
    p = 'contracts/verify/%s_standard_input.json' % n
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(d, ensure_ascii=False))
    print(n, 'json bytes', os.path.getsize(p), 'sources', len(d['sources']))

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)
sftp = client.open_sftp()

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
addrs = {
 'ContentNFT': '0x8537fe7268296f37c2f85f9aad992f11659d1c8a',
 'BudgetFence': '0xe0d246c09d7a3097bab3148f89201157dd531eea',
 'VesselAuth': '0x2d4aebbd5d3e318c0deb91f927019835ecd9a120',
}

for n in names:
    sftp.put('contracts/verify/%s_standard_input.json' % n, '/root/std_%s.json' % n)

sftp.close()

for n in names:
    addr = addrs[n]
    cmd = (
        'curl -s --http2 --compressed --max-time 300 '
        '-H "User-Agent: ' + ua + '" '
        '-H "Accept: application/json, text/plain, */*" '
        '-H "Origin: https://explorer.arc.io" '
        '-H "Referer: https://explorer.arc.io/address/' + addr + '/contract-verification" '
        '-F "compiler_version=v0.8.24+commit.e11b9ed9" '
        '-F "license_type=none" '
        '-F "contract_name=' + n + '" '
        '-F "autodetect_constructor_args=true" '
        '-F "constructor_args=" '
        '-F "files[0]=@/root/std_' + n + '.json;filename=standard-input.json;type=application/json" '
        'https://explorer.arc.io/api/v2/smart-contracts/' + addr + '/verification/via/standard-input'
    )
    stdin, stdout, stderr = client.exec_command(cmd, timeout=400)
    print(n, '->', stdout.read().decode('utf-8','ignore')[:200])
    time.sleep(3)

client.close()
