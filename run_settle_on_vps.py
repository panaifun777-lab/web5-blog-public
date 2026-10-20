import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=15)

sftp = c.open_sftp()
sftp.put('scripts/update_settled_tasks.py', '/root/web5.blog/scripts/update_settled_tasks.py')
sftp.close()

# In VPS, path to db is /root/web5.blog/prisma/db/custom.db
cmd = """python3 -c "
import sqlite3, re
with open('/root/web5.blog/scripts/update_settled_tasks.py', 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace('C:/Users/Administrator/Desktop/Web5.blog/prisma/db/custom.db', '/root/web5.blog/prisma/db/custom.db')
with open('/root/run_update.py', 'w', encoding='utf-8') as f:
    f.write(code)
" && python3 /root/run_update.py
"""
stdin, stdout, stderr = c.exec_command(cmd)
print("Result:\n", stdout.read().decode())
err = stderr.read().decode()
if err: print("Error:", err)

c.close()
