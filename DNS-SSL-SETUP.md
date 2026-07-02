# ════════════════════════════════════════════════════════════════
# Web5.blog DNS + SSL Setup Guide
# Cloudflare Email Routing + SSL Auto-Generation
# ════════════════════════════════════════════════════════════════

## Cloudflare DNS 记录

将以下记录添加到 Cloudflare DNS (web5.blog):

```
Type  Name     Content          TTL    Proxy
A     @        154.9.26.108     Auto   ✅ (橙色云)
A     www      154.9.26.108     Auto   ✅ (橙色云)
```

### SSL 证书（CF 自动）

启用橙色云代理后，CF 自动提供：
- Edge Certificate (CF 签发，自动续期)
- SSL/TLS 模式设为 **Full (strict)** 或 **Flexible**

### VPS 端 Caddy 配置（备用）

如果不用 CF 代理，在 VPS 上运行：

```bash
# 安装 Caddy
apt install -y caddy

# 配置 /etc/caddy/Caddyfile
cat > /etc/caddy/Caddyfile << 'EOF'
web5.blog {
    reverse_proxy localhost:3000
    encode gzip
    header {
        X-Frame-Options DENY
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
    }
}
EOF

systemctl restart caddy
```

### 电子邮件路由（4 步）

1. CF 控制台 → web5.blog → **电子邮件** → **电子邮件路由** → 启用
2. CF 自动添加 MX + SPF + DKIM
3. 目标地址：填主力邮箱
4. 创建路由：admin → 目标邮箱

测试：发邮件到 admin@web5.blog
