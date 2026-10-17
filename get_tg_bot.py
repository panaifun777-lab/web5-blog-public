import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

sftp = client.open_sftp()
sftp.get('/root/web5.blog/scripts/tg-bot.mjs', 'scripts/tg-bot.mjs')
sftp.close()
print("Downloaded tg-bot.mjs from VPS.")
client.close()
