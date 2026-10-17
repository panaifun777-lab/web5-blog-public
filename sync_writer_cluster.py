import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=15)

sftp = client.open_sftp()
print("Syncing upgraded eidolon-writer.ts to VPS...")
sftp.put('src/lib/web5/ai/eidolon-writer.ts', '/root/web5.blog/src/lib/web5/ai/eidolon-writer.ts')
sftp.close()

stdin, stdout, stderr = client.exec_command('cd /root/web5.blog && pm2 restart web5-blog && sleep 3 && pm2 status')
print(stdout.read().decode())
client.close()
