import json, urllib.request

def rpc(method, params):
    req = urllib.request.Request('https://rpc.mainnet.arc.io',
        data=json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode(),
        headers={'Content-Type':'application/json','User-Agent':'Mozilla/5.0'})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

targets = {
 'ContentNFT': '0x8537fe7268296f37c2f85f9aad992f11659d1c8a',
 'BudgetFence': '0xe0d246c09d7a3097bab3148f89201157dd531eea',
 'VesselAuth': '0x2d4aebbd5d3e318c0deb91f927019835ecd9a120',
}

for name, addr in targets.items():
    try:
        code = rpc('eth_getCode', [addr, 'latest'])['result']
        art = json.load(open('contracts/out/%s.sol/%s.json' % (name, name), encoding='utf-8'))
        local = art['deployedBytecode']['object']
        if not local.startswith('0x'):
            local = '0x' + local
        print(name, addr, 'onchain', len(code), 'local', len(local), 'MATCH', code.lower() == local.lower())
    except Exception as e:
        print(name, 'ERR', e)
