import json, urllib.request

def rpc(method, params, url='https://rpc.mainnet.arc.io'):
    req = urllib.request.Request(
        url,
        data=json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode(),
        headers={'Content-Type':'application/json','User-Agent':'Mozilla/5.0'})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

urls = [
 'https://rpc.mainnet.arc.io',
 'https://arc-mainnet.g.alchemy.com/v2/demo',
 'https://mainnet.arc.io',
]
for u in urls:
    try:
        r = rpc('eth_chainId', [], u)
        print(u, '->', r)
    except Exception as e:
        print(u, 'ERR', e)
