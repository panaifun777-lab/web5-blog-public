import paramiko

VPS_IP = '38.55.146.192'
VPS_PORT = 22
VPS_USER = 'root'
VPS_PASS = 'pshpBOOR8459'
REMOTE_BASE = '/root/web5.blog'

files = [
    'src/components/web5/blog/blog-feed.tsx',
    'src/components/web5/dashboard/my-vessels.tsx',
    'src/lib/web5/vessel-wallet.ts',
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_IP, VPS_PORT, VPS_USER, VPS_PASS, timeout=15)

sftp = client.open_sftp()
print("[1/2] Uploading refined UI & wallet files to VPS...")
for f in files:
    sftp.put(f, f"{REMOTE_BASE}/{f}")
    print(f" -> Uploaded {f}")
sftp.close()

print("\n[2/2] Restarting PM2 on VPS...")
stdin, stdout, stderr = client.exec_command(f"cd {REMOTE_BASE} && pm2 restart web5-blog && sleep 3 && pm2 status")
print(stdout.read().decode())

client.close()
print("🎉 VPS Refined UI Sync Completed!")
