import paramiko, json, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
addrs = {
 'WBOGToken': '0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f',
 'ContentNFT': '0x8537fe7268296f37c2f85f9aad992f11659d1c8a',
 'BudgetFence': '0xe0d246c09d7a3097bab3148f89201157dd531eea',
 'VesselAuth': '0x2d4aebbd5d3e318c0deb91f927019835ecd9a120',
}

def status(addr):
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
    body = stdout.read().decode('utf-8','ignore')
    if not body.strip().startswith('{'):
        return None
    return json.loads(body)

for round_no in range(6):
    time.sleep(8)
    print('--- round', round_no)
    allok = True
    for n, a in addrs.items():
        d = status(a)
        if d is None:
            print(n, 'challenge'); allok = False; continue
        print(n, 'verified=', d.get('is_verified'), 'partial=', d.get('is_partially_verified'), 'name=', d.get('name'))
        if not d.get('is_verified'):
            allok = False
    if allok:
        print('ALL VERIFIED')
        break
client.close()
