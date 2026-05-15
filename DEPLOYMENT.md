# Jan Aushadhi Finder — Deployment Guide

## Project Structure

```
jan-aushadhi/
├── backend/
│   └── server.js          # Express API (auth, medicines, stores, reminders)
├── frontend/
│   ├── index.html          # Full PWA frontend (single file)
│   ├── manifest.json       # PWA manifest (Play Store ready)
│   ├── sw.js               # Service worker (offline + push notifications)
│   └── icons/              # PWA icons (72–512px)
├── .env.example            # Environment variable template
├── .gitignore
├── docker-compose.yml      # Full stack with nginx + redis
├── Dockerfile              # Multi-stage production build
├── nginx.conf              # Reverse proxy + SSL + rate limiting
├── package.json
└── DEPLOYMENT.md           # ← You are here
```

---

## 1. Local Development

```bash
# Clone / extract project
cd jan-aushadhi

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env — minimum required: JWT_SECRET

# Start development server (auto-reload)
npm run dev

# Open in browser
open http://localhost:3000
```

---

## 2. Production on a VPS (Ubuntu/Debian)

### Step 1 — Server setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install nginx
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 2 — Deploy app
```bash
# Upload project to server (from local machine)
scp -r ./jan-aushadhi user@YOUR_SERVER_IP:/home/user/

# SSH into server
ssh user@YOUR_SERVER_IP

# Install dependencies
cd /home/user/jan-aushadhi
npm install --omit=dev

# Create .env
cp .env.example .env
nano .env   # Fill in JWT_SECRET, etc.
```

### Step 3 — PM2 process manager
```bash
# Start with PM2
pm2 start backend/server.js --name "jan-aushadhi" --instances max --exec-mode cluster

# Save PM2 config (survives reboots)
pm2 save
pm2 startup

# Monitor
pm2 status
pm2 logs jan-aushadhi
pm2 monit
```

### Step 4 — Nginx + SSL
```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/nginx.conf

# Edit server_name in nginx.conf to your domain
sudo nano /etc/nginx/nginx.conf

# Get SSL certificate (free via Let's Encrypt)
sudo certbot --nginx -d yourapp.com -d www.yourapp.com

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx
```

---

## 3. Docker Deployment (Recommended)

```bash
# Build image
docker build -t jan-aushadhi .

# Run with docker-compose (includes nginx + redis)
cp .env.example .env
nano .env  # fill in secrets

docker-compose up -d

# View logs
docker-compose logs -f app

# Update deployment
docker-compose pull
docker-compose up -d --build

# Stop
docker-compose down
```

---

## 4. Railway (Fastest — free tier available)

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Connect your GitHub repo containing this project
3. Set environment variables in Railway dashboard:
   - `JWT_SECRET` = (generate random 64-char string)
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
4. Railway auto-detects Node.js and deploys. Done ✅

Your app will be live at `https://yourproject.railway.app`

---

## 5. Render (Free tier)

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect GitHub repo
3. Settings:
   - **Build Command**: `npm install --omit=dev`
   - **Start Command**: `node backend/server.js`
   - **Environment**: Node
4. Add environment variables in Render dashboard
5. Click Deploy ✅

---

## 6. Android Play Store via TWA (Trusted Web Activity)

This PWA is Play Store ready. Follow these steps:

### Prerequisites
- Google Play Developer account ($25 one-time)
- Android Studio installed
- Your app deployed at a public HTTPS URL

### Step 1 — Verify PWA criteria ✅
All already configured:
- [x] manifest.json with proper icons
- [x] Service worker with offline support
- [x] HTTPS (required for TWA)
- [x] start_url, display: standalone
- [x] Icons: 192px + 512px (maskable)

### Step 2 — Digital Asset Links
Create file at `https://yourapp.com/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.yourcompany.janaushadhi",
    "sha256_cert_fingerprints": ["YOUR_APP_SHA256_FINGERPRINT"]
  }
}]
```

Add this route to server.js:
```js
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.json([{ ... }]); // your assetlinks content
});
```

### Step 3 — Build TWA with Bubblewrap (easiest method)

```bash
# Install Bubblewrap CLI
npm install -g @bubblewrap/cli

# Initialize TWA project
mkdir my-twa && cd my-twa
bubblewrap init --manifest https://yourapp.com/manifest.json

# Answer prompts:
# Domain: yourapp.com
# Package: com.yourcompany.janaushadhi
# App name: Jan Aushadhi Finder
# Start URL: /
# Theme color: #006B3C
# Background color: #006B3C

# Build APK/AAB
bubblewrap build

# Output: app-release-signed.apk + app-release.aab (for Play Store)
```

### Step 4 — Submit to Play Store
1. Go to [play.google.com/console](https://play.google.com/console)
2. Create new app → "Jan Aushadhi Finder"
3. Upload `app-release.aab`
4. Fill store listing: description, screenshots, category (Medical)
5. Set content rating, target audience
6. Submit for review (typically 3–7 days)

### Step 5 — Screenshots for Play Store
Required sizes: 1080×1920 (phone), 1200×628 (feature graphic)

---

## 7. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ | Random 64-char hex string for JWT signing |
| `NODE_ENV` | ✅ | `production` or `development` |
| `PORT` | ✅ | Server port (default: 3000) |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |
| `DATABASE_URL` | For DB | PostgreSQL connection string |
| `MSG91_AUTH_KEY` | For OTP SMS | MSG91 API key |
| `VAPID_PUBLIC_KEY` | For push | Web push VAPID key |
| `VAPID_PRIVATE_KEY` | For push | Web push VAPID private key |

Generate JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

---

## 8. API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register with email+password |
| POST | `/api/auth/login` | Login with email+password |
| GET | `/api/auth/me` | Get current user (JWT required) |
| POST | `/api/auth/otp/send` | Send OTP to phone |
| POST | `/api/auth/otp/verify` | Verify OTP and get JWT |

### Medicines
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/medicines/search?q=dolo` | Fuzzy search medicines |
| GET | `/api/medicines?page=1&limit=20&sort=savings` | Paginated list |
| GET | `/api/medicines/:id` | Single medicine detail |
| GET | `/api/categories` | All categories with counts |

### Stores
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stores` | All stores |
| GET | `/api/stores/nearby?lat=12.9&lng=77.6&radius=10` | Nearby stores |
| GET | `/api/stores/:id` | Single store |
| POST | `/api/stores/:id/stock-request` | Check medicine stock |

### Reminders
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reminders` | Get user's reminders |
| POST | `/api/reminders` | Create reminder |
| PUT | `/api/reminders/:id` | Update reminder |
| DELETE | `/api/reminders/:id` | Delete reminder |

### Calculator & System
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/calculate-savings` | Calculate prescription savings |
| GET | `/api/health` | Health check |
| GET | `/api/admin/analytics` | Admin analytics (JWT + admin role) |

---

## 9. Upgrading to a Real Database

Current: in-memory arrays (data lost on restart)

For production persistence, swap to PostgreSQL:

```bash
npm install pg
```

Replace the in-memory `users` array in `server.js` with:

```js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Register user
const result = await pool.query(
  'INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING *',
  [name, email, hashed, 'user']
);
```

Schema (run once):
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(15) UNIQUE,
  password TEXT,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reminders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  medicine_name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200),
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  next_refill_date DATE NOT NULL,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
```

---

## 10. Health Check & Monitoring

```bash
# Check API health
curl https://yourapp.com/api/health

# Expected response:
# {"status":"ok","version":"2.0.0","medicines":150,"stores":12,"uptime":3600}

# PM2 monitoring
pm2 monit

# Docker logs
docker-compose logs -f app
```

---

## Support

For issues with this project, check:
- Node.js version: `node --version` (must be ≥ 18)
- Port conflicts: `lsof -i :3000`
- Firewall: ensure port 80, 443, 3000 are open
