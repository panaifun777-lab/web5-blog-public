import paramiko
import os
import time

VPS_IP = '38.55.146.192'
VPS_PORT = 22
VPS_USER = 'root'
VPS_PASS = 'pshpBOOR8459'
REMOTE_BASE = '/root/web5.blog'

files_to_sync = [
    'prisma/schema.prisma',
    'src/app/api/commerce/tasks/route.ts',
    'src/app/api/curve/vault/route.ts',
    'src/app/page.tsx',
    'src/components/web5/commerce/task-board.tsx',
    'src/components/web5/hero/hologram-avatar-stage.tsx',
    'src/components/web5/vault/genesis-curve-modal.tsx',
    'src/lib/web5/ap2/commerce.ts',
    'src/lib/web5/daemon/agent-daemon.ts',
]

print(f"Connecting to VPS {VPS_IP}...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_IP, VPS_PORT, VPS_USER, VPS_PASS, timeout=15)

sftp = client.open_sftp()

print("\n[1/4] Uploading upgraded files via SFTP...")
for rel_path in files_to_sync:
    local_path = os.path.normpath(rel_path)
    remote_path = f"{REMOTE_BASE}/{rel_path.replace(os.sep, '/')}"
    remote_dir = os.path.dirname(remote_path)
    
    # Ensure remote directory exists
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        # Create directory
        client.exec_command(f"mkdir -p '{remote_dir}'")
        time.sleep(0.5)

    print(f" -> Uploading {rel_path} -> {remote_path}")
    sftp.put(local_path, remote_path)

sftp.close()
print("All files uploaded successfully!")

print("\n[2/4] Executing Prisma DB Push & Generate on VPS...")
cmd_prisma = f"cd {REMOTE_BASE} && npx prisma db push --skip-generate && npx prisma generate"
stdin, stdout, stderr = client.exec_command(cmd_prisma, timeout=60)
out = stdout.read().decode()
err = stderr.read().decode()
print("Prisma Output:\n", out)
if err and "warn" not in err.lower():
    print("Prisma Errors:\n", err)

print("\n[3/4] Gracefully restarting PM2 (web5-blog)...")
stdin, stdout, stderr = client.exec_command(f"cd {REMOTE_BASE} && pm2 restart web5-blog && sleep 3 && pm2 status")
print(stdout.read().decode())

print("\n[4/4] Verifying production endpoints...")
time.sleep(3)
test_cmd = (
    "curl -s -w '\nHTTP: %{http_code}\n' http://localhost:3000/api/commerce/tasks && "
    "curl -s -w '\nHTTP: %{http_code}\n' http://localhost:3000/api/curve/vault"
)
stdin, stdout, stderr = client.exec_command(test_cmd, timeout=15)
print("Endpoints Verification Output:\n", stdout.read().decode())

client.close()
print("🎉 VPS Deployment and Sync Completed!")
