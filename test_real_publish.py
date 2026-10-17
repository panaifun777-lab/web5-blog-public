import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('38.55.146.192', 22, 'root', 'pshpBOOR8459', timeout=20)

test_script = r'''
const { publishContent } = require("/root/web5.blog/src/lib/web5/content/publisher");

async function run() {
  const mockSession = {
    primeDid: "did:plvtvs:0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1",
    eidolonDid: "did:eidolon:core-avatar",
    vesselDid: "0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1",
    permissions: ["publish", "read", "tip"],
    sessionToken: "test",
    expiresAt: Date.now() + 86400000
  };
  try {
    const res = await publishContent({
      title: "【创世测试】Web5 去中心化思想母体首次真实上链验证",
      bodyMd: "这是通过 Irys 去中心化网关真实广播并存储至 Arweave 链上网络的博文。具有永久抗审查、不可篡改与全网秒查特性。",
      license: "CC_BY",
      royaltyRate: 100
    }, mockSession);
    console.log("PUBLISH RESULT:", JSON.stringify(res, null, 2));
  } catch (e) {
    console.error("PUBLISH ERROR:", e.message, e.stack);
  }
}
run();
'''

stdin, stdout, stderr = client.exec_command('cd /root/web5.blog && node -e \'' + test_script.strip() + '\'', timeout=60)
print(stdout.read().decode())
print(stderr.read().decode()[:400])
client.close()
