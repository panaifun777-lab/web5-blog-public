# Web5.blog VPS 部署指南

## VPS 配置推荐

### 入门（MVP 测试）— ~$10/月
- **规格**: 2 vCPU / 4GB RAM / 80GB SSD
- **系统**: Ubuntu 22.04 LTS
- **适合**: 10-50 用户，开发与测试
- **供应商**: DigitalOcean / Vultr / Hetzner

### 标准（Beta 公测）— ~$25/月
- **规格**: 4 vCPU / 8GB RAM / 160GB SSD
- **系统**: Ubuntu 22.04 LTS
- **适合**: 100-500 用户，AP2 微支付测试
- **供应商**: DigitalOcean / Vultr / AWS Lightsail

### 生产（GA 上线）— ~$60/月
- **规格**: 8 vCPU / 16GB RAM / 320GB NVMe
- **系统**: Ubuntu 24.04 LTS
- **适合**: 1000+ 用户，合约节点 + 索引器
- **供应商**: AWS EC2 / GCP Compute / Hetzner Cloud

### 高可用（集群）— ~$200/月
- **规格**: 3 × 8 vCPU / 3 × 32GB RAM / 负载均衡 / Kubernetes
- **系统**: Ubuntu 24.04 LTS + K8s
- **适合**: 10000+ 用户，多区域部署
- **供应商**: AWS EKS / GCP GKE / Azure AKS

## 部署清单

### 系统依赖
```bash
# Node.js 20+ / Bun 1.1+
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# PostgreSQL 15+（生产）或 SQLite（开发）
sudo apt install -y postgresql postgresql-contrib

# Redis 7+（可选，缓存层）
sudo apt install -y redis-server

# Nginx（反向代理 + SSL）
sudo apt install -y nginx

# PM2（进程管理）
npm install -g pm2

# Foundry（合约编译部署）
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 项目部署
```bash
# 克隆仓库
git clone https://github.com/piaoshuweb3/web5-blog.git
cd web5-blog

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env：
#   DATABASE_URL=postgresql://user:pass@localhost:5432/web5blog
#   VESSEL_TOKEN_SECRET=<strong-random-secret>
#   IRYS_PRIVATE_KEY=<your-irys-key>
#   SUPERADMIN=0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1

# 推送数据库 schema
bun run db:push

# 种子内容与用户
bun run scripts/seed-content.ts
bun run scripts/seed-users.ts

# 部署合约（Base Sepolia）
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge build
cp .env.example .env
# 编辑 .env 填入 DEPLOYER_PRIVATE_KEY
bun run scripts/deploy.ts

# 启动应用
pm2 start "bun run dev" --name web5-blog
pm2 save
pm2 startup
```

### Nginx 反向代理
```nginx
server {
    listen 80;
    server_name web5.blog;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL 证书
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d web5.blog
```

### 防火墙
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## 监控

### PM2 监控
```bash
pm2 status
pm2 logs web5-blog
pm2 monit
```

### 日志轮转
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 健康检查
```bash
# 添加 cron 健康检查
echo "*/5 * * * * curl -f http://localhost:3000/api/health || pm2 restart web5-blog" | crontab -
```

## 备份

### 数据库备份
```bash
# 每日备份
echo "0 3 * * * pg_dump web5blog | gzip > /backups/web5blog-$(date +\%Y\%m\%d).sql.gz" | crontab -

# 保留 30 天
find /backups -name "web5blog-*.sql.gz" -mtime +30 -delete
```

### Arweave 内容备份
- Arweave 内容天然永久存储，无需备份
- 仅需备份 Prisma 数据库（含 Content NFT tokenId、ARP VC ID 等元数据）

## 安全加固

### 1. SSH 密钥登录
```bash
# 禁用密码登录
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### 2. Fail2ban（防暴力破解）
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### 3. 自动安全更新
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 推荐供应商对比

| 供应商 | 优势 | 起步价 | 区域 |
|--------|------|--------|------|
| DigitalOcean | 简单易用，全球节点 | $4/月 | 全球 14 区 |
| Vultr | 按小时计费，灵活 | $2.5/月 | 全球 32 区 |
| Hetzner | 性价比最高（欧洲） | €3/月 | 欧洲/美国 |
| AWS EC2 | 企业级，生态完整 | $3.5/月 | 全球 30+ 区 |
| GCP Compute | AI/ML 集成 | $4/月 | 全球 35+ 区 |
| Azure | 企业合规 | $4/月 | 全球 60+ 区 |

## 成本估算

### MVP 阶段（100 用户）
- VPS: $10/月
- 域名: $10/年
- Arweave 存储: $5/月（估算）
- Gas（Base Sepolia 测试网）: $0
- **总计: ~$15/月**

### Beta 阶段（500 用户）
- VPS: $25/月
- 域名: $10/年
- Arweave 存储: $25/月
- Gas（Base L2 主网）: $10/月
- **总计: ~$60/月**

### 生产阶段（1000+ 用户）
- VPS: $60/月
- 域名: $10/年
- Arweave 存储: $100/月
- Gas（Base L2 主网）: $50/月
- 监控服务: $20/月
- **总计: ~$230/月**
