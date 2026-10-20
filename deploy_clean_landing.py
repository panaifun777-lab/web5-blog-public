import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=15)

sftp = c.open_sftp()
sftp.put('src/app/page.tsx', '/root/web5.blog/src/app/page.tsx')
sftp.close()

stdin, stdout, stderr = c.exec_command('cd /root/web5.blog && pm2 restart web5-blog && sleep 2 && pm2 status')
print("VPS Status:\n", stdout.read().decode())
c.close()
print("🎉 RitualLanding clean UI deployed to VPS!")
