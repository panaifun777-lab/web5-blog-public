import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

sftp = client.open_sftp()
files = [
    ('src/lib/web5/content/publisher.ts', '/root/web5.blog/src/lib/web5/content/publisher.ts'),
    ('src/lib/web5/content/arweave-uploader.ts', '/root/web5.blog/src/lib/web5/content/arweave-uploader.ts'),
    ('src/components/web5/blog/blog-feed.tsx', '/root/web5.blog/src/components/web5/blog/blog-feed.tsx'),
]

for local, remote in files:
    print(f"Syncing {local} -> {remote} ...")
    sftp.put(local, remote)

sftp.close()

print("Restarting PM2 web5-blog...")
stdin, stdout, stderr = client.exec_command('cd /root/web5.blog && pm2 restart web5-blog && sleep 2 && pm2 status')
print(stdout.read().decode())
client.close()
