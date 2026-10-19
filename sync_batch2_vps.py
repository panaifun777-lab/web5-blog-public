import paramiko

VPS_IP = '38.55.146.192'
VPS_PORT = 22
VPS_USER = 'root'
VPS_PASS = 'pshpBOOR8459'
REMOTE_BASE = '/root/web5.blog'

files = [
    'humanity_part2_en.md',
    'humanity_part3_zh.md',
    'humanity_part3_en.md',
    'publish_humanities_batch2.ts',
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_IP, VPS_PORT, VPS_USER, VPS_PASS, timeout=15)

sftp = client.open_sftp()
print("[1/2] Uploading batch 2 articles and publishing script to VPS...")
for f in files:
    sftp.put(f, f"{REMOTE_BASE}/{f}")
    print(f" -> Uploaded {f}")
sftp.close()

print("\n[2/2] Executing batch 2 publishing script on VPS...")
cmd = f"cd {REMOTE_BASE} && npx tsx publish_humanities_batch2.ts"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')
print("VPS Output:\n", out)
if err:
    print("VPS Stderr:\n", err)

client.close()
print("🎉 Batch 2 successfully published on VPS!")
