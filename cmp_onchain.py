import json, urllib.request

def rpc(method, params, url='https://rpc.mainnet.arc.io'):
    req = urllib.request.Request(
        url,
        data=json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode(),
        headers={'Content-Type':'application/json','User-Agent':'Mozilla/5.0'})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

res = rpc('eth_getCode', ['0x5be2d3f16d008316fdb9964c7fd7b8a4a26d2f5f','latest'])
code = res.get('result')
if not code:
    print('ERR', res)
    raise SystemExit

with open('contracts/out/WBOGToken.sol/WBOGToken.json', encoding='utf-8') as f:
    d = json.load(f)
local = d['deployedBytecode']['object']
if not local.startswith('0x'):
    local = '0x' + local

print('onchain len', len(code), 'local len', len(local))
print('EXACT MATCH:', code.lower() == local.lower())
print('strip tail 120 match:', code.lower()[:-120] == local.lower()[:-120])
print('onchain tail:', code[-120:])
print('local tail  :', local[-120:])
