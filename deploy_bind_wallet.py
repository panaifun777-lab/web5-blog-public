import paramiko
import os

VPS_IP = '38.55.146.192'
VPS_PORT = 22
VPS_USER = 'root'
VPS_PASS = 'pshpBOOR8459'
REMOTE_BASE = '/root/web5.blog'

files_to_sync = [
    'src/app/api/auth/bind-wallet/route.ts',
    'src/components/web5/auth/wallet-guide-modal.tsx',
    'src/app/page.tsx',
    'src/components/web5/dashboard/my-vessels.tsx',
    'src/lib/web5/vessel-wallet.ts',
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_IP, VPS_PORT, VPS_USER, VPS_PASS, timeout=15)

sftp = client.open_sftp()
print("[1/2] Syncing bind-wallet, wallet-guide, and root wallet verification...")
for f in files_to_sync:
    local_path = os.path.normpath(f)
    remote_path = f"{REMOTE_BASE}/{f.replace(os.sep, '/')}"
    remote_dir = os.path.dirname(remote_path)
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        client.exec_command(f"mkdir -p '{remote_dir}'")
    
    sftp.put(local_path, remote_path)
    print(f" -> Uploaded {f}")
sftp.close()

print("\n[2/2] Restarting PM2 on VPS...")
stdin, stdout, stderr = client.exec_command(f"cd {REMOTE_BASE} && pm2 restart web5-blog && sleep 3 && pm2 status")
print(stdout.read().decode())

client.close()
print("🎉 Synchronized & Restarted successfully!")
