import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
bash = r'''
mkdir -p /tmp/chunks && cd /tmp/chunks
grep -o "/_next/static/chunks/[a-zA-Z0-9._/-]*\.js" /tmp/page.html | sort -u > list.txt
while read p; do
  f=$(echo "$p" | tr '/' '_')
  [ -f "$f" ] || curl -s --compressed -H "User-Agent: UA_PLACEHOLDER" "https://explorer.arc.io$p" -o "$f"
done < list.txt
echo "downloaded: $(ls *.js 2>/dev/null | wc -l)"
echo "--- files mentioning standard-input ---"
grep -l "standard-input" *.js 2>/dev/null
echo "--- files mentioning compiler_version ---"
grep -l "compiler_version" *.js 2>/dev/null
'''.replace('UA_PLACEHOLDER', ua)

sftp = client.open_sftp()
with sftp.file('/root/grab_chunks.sh', 'w') as f:
    f.write(bash)
sftp.close()

stdin, stdout, stderr = client.exec_command('bash /root/grab_chunks.sh', timeout=900)
print(stdout.read().decode('utf-8','ignore'))
print('ERR', stderr.read().decode('utf-8','ignore')[:500])
client.close()
