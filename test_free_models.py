import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=15)

commands = """
python3 -c "
import urllib.request, json

url = 'https://text.pollinations.ai/openai/chat/completions'
payload = json.dumps({
    'model': 'openai',
    'messages': [
        {'role': 'system', 'content': '你是一个专业的 Web5 与区块链研究员。请用中文写一篇严谨深入的长文。'},
        {'role': 'user', 'content': '请围绕【去中心化 AI 智能体与 Circle ARC 稳定币公链微支付】写一篇 1000 字以上的深度分析，包含子标题和丰富推导。'}
    ]
}).encode('utf-8')

req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=30) as r:
    data = json.loads(r.read().decode('utf-8'))
    content = data['choices'][0]['message']['content']
    print('Generated Chinese words length:', len(content))
    print('Preview:\n', content[:400])
"
"""
stdin, stdout, stderr = client.exec_command(commands)
out = stdout.read().decode('utf-8')
print("Chinese Long Article Test:\n", out)
client.close()
