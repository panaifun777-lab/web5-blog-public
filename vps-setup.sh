#!/bin/bash
# ════════════════════════════════════════════════════════════════
# VPS 一键初始化脚本 — Web5.blog
# 适用于：Ubuntu 22.04 LTS (x86_64)
# 用法：bash vps-setup.sh
# ════════════════════════════════════════════════════════════════
set -e

echo "========================================="
echo " Web5.blog VPS 初始化脚本"
echo " 适用: Ubuntu 22.04 LTS"
echo "========================================="

# ── 1. 系统更新 ──
echo "[1/8] 系统更新..."
apt update && apt upgrade -y

# ── 2. 基础依赖 ──
echo "[2/8] 安装基础依赖..."
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw

# ── 3. Node.js 22 LTS ──
echo "[3/8] 安装 Node.js 22 LTS..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2

# ── 4. Swap 分区（2GB 内存机器必备） ──
echo "[4/8] 配置 Swap 分区..."
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl -p
fi

# ── 5. 防火墙（仅开 80/443/SSH） ──
echo "[5/8] 配置 UFW 防火墙..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── 6. Nginx 反向代理 ──
echo "[6/8] 配置 Nginx 反向代理..."
cat > /etc/nginx/sites-available/web5-blog << 'NGINX'
server {
    listen 80;
    server_name _;

    # 301 redirect to domain (replace with your domain)
    # server_name web5.blog www.web5.blog;
    # return 301 https://$server_name$request_uri;

    # 非 HTTPS 模式（开发测试用）
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE 需要的缓冲设置
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # WebSocket (HMR in dev mode)
    location /_next/webpack-hmr {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }
}
NGINX

# Enable site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/web5-blog /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# ── 7. SSL 证书（域名指向后启用） ──
echo "[7/8] SSL 证书（如需）..."
echo "  当域名指向本机后，执行："
echo "  certbot --nginx -d your-domain.com -d www.your-domain.com"
echo ""

# ── 8. 项目部署 ──
echo "[8/8] 项目部署..."
if [ ! -d /root/web5-blog ]; then
  echo "  请先手动部署项目到 /root/web5-blog"
  echo "  部署命令参考："
  echo "  cd /root && git clone <your-repo> web5-blog"
  echo "  cd web5-blog && npm install"
  echo "  npx prisma generate"
  echo "  pm2 start npm --name web5-blog -- run dev -- --port 3000"
else
  echo "  /root/web5-blog 已存在"
fi

# ── PM2 开机自启 ──
echo ""
pm2 save --force
pm2 startup systemd

echo "========================================="
echo " ✅ VPS 初始化完成！"
echo "========================================="
echo ""
echo "  访问地址: http://$(curl -s ifconfig.me):80"
echo "  Node.js: $(node -v)"
echo "  NPM: $(npm -v)"
echo "  PM2: $(pm2 -v)"
echo ""
echo "  ⚠️ 防火墙已启用（80/443/SSH 仅）"
echo "  ⚠️ 端口 3000 不再对外开放"
echo "  ⚠️ SSL 证书：域名指向后运行："
echo "    certbot --nginx -d your-domain.com"
echo ""
echo "========================================="
