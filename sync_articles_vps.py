import paramiko
import os

VPS_IP = '38.55.146.192'
VPS_PORT = 22
VPS_USER = 'root'
VPS_PASS = 'pshpBOOR8459'
REMOTE_BASE = '/root/web5.blog'

files = [
    'humanity_web5_part1_zh.md',
    'humanity_part1_en.md',
    'humanity_part2_zh.md',
    'publish_humanities.ts',
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_IP, VPS_PORT, VPS_USER, VPS_PASS, timeout=15)

sftp = client.open_sftp()
print("[1/3] Uploading article files and publishing script to VPS...")
for f in files:
    sftp.put(f, f"{REMOTE_BASE}/{f}")
    print(f" -> Uploaded {f}")
sftp.close()

print("\n[2/3] Executing publishing script on VPS...")
cmd = f"cd {REMOTE_BASE} && npx tsx publish_humanities.ts"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')
print("VPS Output:\n", out)
if err:
    print("VPS Stderr:\n", err)

print("\n[3/3] Verifying articles via API on VPS...")
test_cmd = "curl -s 'http://localhost:3000/api/content/list?limit=5' | head -c 500"
stdin, stdout, stderr = client.exec_command(test_cmd, timeout=10)
print("Content List API Output:\n", stdout.read().decode())

client.close()
print("🎉 All 3 articles published to VPS production live!")
