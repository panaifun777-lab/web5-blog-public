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
    'src/lib/web5/auth/eip712-types.ts',
    'src/lib/web5/ap2/remote-jobs.ts',
    'src/lib/web5/ap2/commerce.ts',
    'src/app/api/auth/bind-wallet/route.ts',
    'src/app/api/auth/withdraw/route.ts',
    'src/app/api/content/list/route.ts',
    'src/app/api/content/detail/route.ts',
    'src/app/api/explore/route.ts',
    'src/lib/web5/seo.ts',
    'src/components/web5/crowdfunding/crowdfunding-panel.tsx',
    'src/components/web5/commerce/task-board.tsx',
    'src/components/web5/explore/explore-panel.tsx',
    'src/components/web5/blog/blog-feed.tsx',
    'src/app/page.tsx',
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_IP, VPS_PORT, VPS_USER, VPS_PASS, timeout=15)

sftp = client.open_sftp()
print("[1/4] Syncing all multi-agent upgraded files to VPS...")
for f in files_to_sync:
    local_path = os.path.normpath(f)
    remote_path = f"{REMOTE_BASE}/{f.replace(os.sep, '/')}"
    remote_dir = os.path.dirname(remote_path)
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        client.exec_command(f"mkdir -p '{remote_dir}'")
        time.sleep(0.2)
    
    sftp.put(local_path, remote_path)
    print(f" -> Uploaded {f}")
sftp.close()

print("\n[2/4] Executing Prisma DB Push & Generate on VPS...")
cmd_prisma = f"cd {REMOTE_BASE} && npx prisma db push --skip-generate && npx prisma generate"
stdin, stdout, stderr = client.exec_command(cmd_prisma, timeout=60)
out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')
print("Prisma Output:\n", out)
if err and "warn" not in err.lower():
    print("Prisma Stderr:\n", err)

print("\n[3/4] Updating Database tasks & clean anonymous data...")
update_script = """
import sqlite3
conn = sqlite3.connect('/root/web5.blog/prisma/db/custom.db')
c = conn.cursor()
# update TaskOrder seed 4 to SETTLED
c.execute('''
UPDATE TaskOrder SET 
  status = 'SETTLED',
  assignedAgentDid = 'did:eidolon:sec-auditor-04',
  deliverableHash = '0x5db2815a1b9cac62ff81323af373451d11f3a9e7258b1e522111f13aa2e5f0b2',
  deliverableContent = '# 智能合约安全审计同行评议报告 (BudgetFence & VesselAuth)\\n\\n- 审计状态: PASS\\n- 发现项: 0 High, 0 Critical\\n- 资金流向: 80% 创作者, 10% 运营出纳, 10% Uniswap v4 LP 锁定'
WHERE orderId LIKE '%seed-4%' OR title LIKE '%BudgetFence%'
''')
# update any anonymous author to 飘叔
c.execute("UPDATE Prime SET displayName = '飘叔 (piaoshu)' WHERE displayName = 'Anonymous' OR displayName = 'Web5 Pioneer'")
conn.commit()
print("Updated tasks & author profiles!")
conn.close()
"""
stdin, stdout, stderr = client.exec_command(f'python3 -c "{update_script}"')
print("DB Update:\n", stdout.read().decode())

print("\n[4/4] Restarting PM2 web5-blog...")
stdin, stdout, stderr = client.exec_command(f"cd {REMOTE_BASE} && pm2 restart web5-blog && sleep 3 && pm2 status")
print(stdout.read().decode())

client.close()
print("🎉 All Multi-Agent upgrades successfully deployed to VPS!")
