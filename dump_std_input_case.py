import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

cmd = r'''cd /tmp/chunks
python3 - <<"PY"
import re
f = open('__next_static_chunks_43f0mwxbzwx60.js', encoding='utf-8', errors='ignore').read()
i = f.find('case"standard-input":{')
print(f[i:i+900])
print('\n===== defaults =====')
j = f.find('"standard-input":{address:')
print(f[j:j+400])
PY'''
stdin, stdout, stderr = client.exec_command(cmd, timeout=180)
print(stdout.read().decode('utf-8','ignore'))
print('ERR', stderr.read().decode('utf-8','ignore')[:300])
client.close()
