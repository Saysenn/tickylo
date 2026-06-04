# Redis + BullMQ Worker — Self-Hosting Guide

Self-hosted on a single VPS. Fixed cost, no pay-per-request surprises.

---

## 1. Get a VPS

**Recommended:** Hetzner CX22 (~$4–6/mo)
- 2 vCPU, 4GB RAM, 40GB SSD
- Sign up at hetzner.com → create server → Ubuntu 22.04

---

## 2. Initial Server Setup

```bash
# SSH into your server
ssh root@your-vps-ip

# Update
apt update && apt upgrade -y

# Install Docker + PM2
apt install -y docker.io
npm install -g pm2

# Enable Docker on boot
systemctl enable docker
systemctl start docker
```

---

## 3. Run Redis

```bash
docker run -d \
  --name redis \
  --restart always \
  -p 127.0.0.1:6379:6379 \
  redis:alpine \
  redis-server --requirepass YOUR_STRONG_PASSWORD
```

> `127.0.0.1:6379` binds Redis to localhost only — not exposed to the internet.

Verify it's running:
```bash
docker exec -it redis redis-cli -a YOUR_STRONG_PASSWORD ping
# → PONG
```

---

## 4. Connect Vercel to Redis via SSH Tunnel

Since Redis is localhost-only, Vercel reaches it through a secure tunnel.

**On your VPS**, create a tunnel user:
```bash
adduser tunnel --disabled-password
```

**On Vercel**, set this env var:
```env
REDIS_URL=redis://:YOUR_STRONG_PASSWORD@127.0.0.1:6379
```

Then in your Next.js app, establish the tunnel on startup using `tunnel-ssh` or use **Hetzner private networking** (simpler — see step 4b).

**4b. Easier alternative — Hetzner Private Network**
1. In Hetzner console → Networks → Create network
2. Attach your VPS to it → VPS gets a private IP like `10.0.0.2`
3. Bind Redis to that private IP instead:
```bash
docker run -d \
  --name redis \
  --restart always \
  -p 10.0.0.2:6379:6379 \
  redis:alpine \
  redis-server --requirepass YOUR_STRONG_PASSWORD
```
4. Set in Vercel:
```env
REDIS_URL=redis://:YOUR_STRONG_PASSWORD@10.0.0.2:6379
```

---

## 5. Deploy the Worker

The worker is a Node.js script that lives on the same VPS, connects to local Redis, and processes jobs.

**Copy your worker to the VPS:**
```bash
scp -r ./worker root@your-vps-ip:/app/worker
```

**Install dependencies:**
```bash
ssh root@your-vps-ip
cd /app/worker
npm install
```

**Start with PM2:**
```bash
pm2 start index.js --name report-worker
pm2 save
pm2 startup   # follow the printed command to enable on boot
```

**Check logs:**
```bash
pm2 logs report-worker
pm2 status
```

---

## 6. Firewall

```bash
apt install -y ufw
ufw allow 22       # SSH
ufw deny 6379      # Redis — never public
ufw enable
```

Redis is already localhost-only from step 3, but this adds an extra layer.

---

## 7. Environment Variables Summary

**On Vercel:**
```env
REDIS_URL=redis://:YOUR_STRONG_PASSWORD@10.0.0.2:6379
RESEND_API_KEY=re_...
EMAIL_FROM=Tickylo <noreply@yourdomain.com>
```

**On VPS worker (.env):**
```env
REDIS_URL=redis://:YOUR_STRONG_PASSWORD@127.0.0.1:6379
DATABASE_URL=your-supabase-db-url
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
```

---

## 8. Updating the Worker

```bash
# Pull latest code
cd /app/worker
git pull

# Restart
pm2 restart report-worker
```

---

## Cost Summary

| Item | Cost |
|---|---|
| Hetzner CX22 VPS | ~$5/mo fixed |
| Redis | free (self-hosted) |
| BullMQ | free (open source) |
| **Total** | **~$5/mo** |

No per-request fees. No surprise bills. DDoS hits your VPS, not your wallet.
