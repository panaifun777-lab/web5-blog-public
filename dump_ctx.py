import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

cmd = r'''cd /tmp/chunks
for f in __next_static_chunks_34e1rt8akelro.js __next_static_chunks_43f0mwxbzwx60.js; do
  echo "===== $f"
  grep -o ".\{240\}compiler_version.\{400\}" "$f" | head -n 4
  echo "----- standard-input context"
  grep -o ".\{200\}standard-input.\{200\}" "$f" | head -n 3
done'''
stdin, stdout, stderr = client.exec_command(cmd, timeout=180)
print(stdout.read().decode('utf-8','ignore')[:6000])
client.close()
