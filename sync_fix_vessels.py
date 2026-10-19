import paramiko

VPS_IP = '38.55.146.192'
VPS_PORT = 22
VPS_USER = 'root'
VPS_PASS = 'pshpBOOR8459'
REMOTE_PATH = '/root/web5.blog/src/components/web5/dashboard/my-vessels.tsx'
LOCAL_PATH = 'src/components/web5/dashboard/my-vessels.tsx'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_IP, VPS_PORT, VPS_USER, VPS_PASS, timeout=15)

sftp = client.open_sftp()
print("Uploading updated my-vessels.tsx to VPS...")
sftp.put(LOCAL_PATH, REMOTE_PATH)
sftp.close()

print("Restarting PM2 web5-blog...")
stdin, stdout, stderr = client.exec_command("cd /root/web5.blog && pm2 restart web5-blog && sleep 2 && pm2 status")
print(stdout.read().decode())

client.close()
print("🎉 Synchronized & Restarted successfully!")
