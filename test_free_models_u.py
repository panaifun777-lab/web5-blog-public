import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=15)

commands = """
python3 -u test_free_models.py 2>&1
"""
stdin, stdout, stderr = client.exec_command(commands)
out = stdout.read().decode('utf-8')
print("Output:\n", out)
client.close()
