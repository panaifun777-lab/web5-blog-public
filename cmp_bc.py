import json, hashlib

with open('contracts/out/WBOGToken.sol/WBOGToken.json', encoding='utf-8') as f:
    orig = json.load(f)
with open('_verify_flat/out/WBOGToken.sol/WBOGToken.json', encoding='utf-8') as f:
    flat = json.load(f)

o = orig['bytecode']['object']
n = flat['bytecode']['object']
print('original len', len(o))
print('flat     len', len(n))
print('IDENTICAL:', o == n)
print('orig sha', hashlib.sha256(o.encode()).hexdigest()[:24])
print('flat sha', hashlib.sha256(n.encode()).hexdigest()[:24])

od = orig['deployedBytecode']['object']
nd = flat['deployedBytecode']['object']
print('runtime same:', od == nd, len(od), len(nd))
