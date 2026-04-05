# 🚀 PRODUCTION DEPLOYMENT CHECKLIST

## ⚠️ CRITICAL - Must Fix Before Deploy

### 1. Remove Debug Print Statements
**Location:** [main.py](main.py)

Debug `print()` statements must be removed from production code:
- Line 65: `print("Starting AUTOTEST application...")`
- Line 74: `print("[OK] Database connection successful")`
- Line 76: `print(f"[ERROR] Database connection failed: {e}")`
- Line 83: `print(f"[ML) Retrain scheduler: {result}")`
- Line 85: `print(f"[ML] Retrain scheduler startup check failed: {exc}")`
- Line 91: `print("[OK] Leaderboard snapshots refreshed")`
- Line 93: `print(f"[WARN] Leaderboard refresh failed: {exc}")`
- Line 100: `print("Shutting down AUTOTEST application...")`
- Line 105: `print("[OK] Database engine disposed")`
- Line 222: `print(f"!!! main.py logic initialized with origins: {allow_origins} !!!")`

**Fix:** Replace with `logger.info()` or remove entirely

---

### 2. Verify Debug Mode is Disabled
**Location:** `.env.prod`

Ensure:
```bash
DEBUG=false          # NOT "true"
ENVIRONMENT=production
LOG_LEVEL=WARNING    # Or ERROR for less noise
```

**Check:** The application validates that `DEBUG=false` in production - this is enforced.

---

## 📋 REQUIRED CONFIGURATION

### 3. Environment Variables (.env.prod)

**Must Fill These:**
```bash
# Database (REQUIRED)
DB_USER=autotest_prod
DB_PASSWORD=<GENERATE_STRONG_PASSWORD>
DB_NAME=autotest_prod
EXPECTED_DATABASE_NAME=autotest_prod

# Security (REQUIRED)
SECRET_KEY=<GENERATE_64+_CHARACTER_RANDOM_STRING>
# Use: python -c "import secrets; print(secrets.token_urlsafe(64))"

# Payment Integration (REQUIRED if payments enabled)
TSPAY_ACCESS_TOKEN=<production_token>
TSPAY_WEBHOOK_SECRET=<production_webhook_secret>

# Email (REQUIRED - choose one)
RESEND_API_KEY=<your_resend_api_key>
# OR
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<your_email>
SMTP_PASSWORD=<your_app_password>
SMTP_FROM=noreply@yourdomain.com

# Frontend URLs (REQUIRED)
FRONTEND_SUCCESS_URL=https://yourdomain.com/payment/success
FRONTEND_CANCEL_URL=https://yourdomain.com/payment/cancel

# Optional - Monitoring
SENTRY_DSN=<optional_sentry_dsn>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Generate Strong Keys:**
```bash
# SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(64))"

# DB_PASSWORD
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 🐳 DOCKER DEPLOYMENT

### 4. Build and Test Locally
```bash
# Copy environment
cp .env.prod.example .env.prod

# Edit with production values
nano .env.prod

# Build and test
docker-compose -f docker-compose.yml --build
docker-compose -f docker-compose.yml up

# Test API
curl -i http://localhost:8000/health
```

### 5. Push to Production Server
```bash
# On server
git clone <your-repo>
cd Loyiha_003.1

# Copy and configure
cp .env.prod.example .env.prod
nano .env.prod  # Fill with production values

# Deploy
docker-compose -f docker-compose.yml up -d --build

# Verify
docker-compose ps
docker-compose logs -f backend
curl http://localhost:8000/health
```

---

## ⚙️ NGINX SETUP (Server-Side)

### 6. Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/autotest`:
```nginx
upstream autotest_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;
    
    # Backend proxy
    location /api/ {
        proxy_pass http://autotest_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
    
    # Frontend
    location / {
        root /var/www/frontend/out;  # Next.js static export
        try_files $uri $uri/ /index.html;
    }
    
    # Uploads
    location /uploads/ {
        alias /app/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/autotest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📊 MONITORING & LOGGING

### 7. Set Up Logging
Backend logs go to Docker:
```bash
docker-compose logs -f backend
docker-compose logs -f db
```

For persistent logs, update docker-compose.yml logging driver (optional):
```yaml
services:
  backend:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### 8. Optional - Sentry Error Tracking
```bash
# Sign up at https://sentry.io
# Get DSN and add to .env.prod
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
```

---

## 🔐 SECURITY CHECKLIST

### 9. Verify Production Security
- [ ] `DEBUG=false` in `.env.prod`
- [ ] `SECRET_KEY` is strong (64+ random characters)
- [ ] `DB_PASSWORD` is strong
- [ ] No hardcoded secrets in code
- [ ] CORS origins don't include `*` or localhost
- [ ] HTTPS/SSL certificate configured
- [ ] Email verification enabled (`ENABLE_EMAIL_VERIFICATION=true`)
- [ ] No debug endpoints exposed (`/debug-cors`, `/debug/request` disabled)
- [ ] Database backups configured
- [ ] Firewalls configured (only 80, 443 open to public)

---

## 💾 DATABASE BACKUPS

### 10. Configure PostgreSQL Backups
```bash
# On server, create backup script: /usr/local/bin/backup-autotest.sh
#!/bin/bash
BACKUP_DIR="/var/backups/autotest"
DATE=$(date +%Y%m%d_%H%M%S)

docker-compose -f /path/to/docker-compose.yml exec -T db \
  pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep last 14 backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +14 -delete
```

Schedule with cron:
```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-autotest.sh
```

---

## 🚀 DEPLOYMENT STEPS

### 11. Final Deployment
```bash
# 1. Prepare server
ssh user@server
cd /app/autotest  # or your app directory
git pull  # or git clone if new

# 2. Configure production environment
cp .env.prod.example .env.prod
# Edit with actual values
nano .env.prod

# 3. Build and deploy
docker-compose -f docker-compose.yml up -d --build

# 4. Verify health
docker-compose ps
curl -i https://yourdomain.com/health

# 5. Check logs for errors
docker-compose logs -f backend

# 6. Test API endpoints
curl https://yourdomain.com/api/health
curl https://yourdomain.com/api/docs  # Should NOT be exposed in prod

# 7. Verify database connected
curl -X GET https://yourdomain.com/api/tests/is-debug
# Should return {"is_debug": false}
```

---

## ❌ THINGS TO AVOID IN PRODUCTION

- Do NOT expose `/docs` or `/redoc` endpoints publicly
- Do NOT use HTTP (use HTTPS only)
- Do NOT enable DEBUG mode
- Do NOT use default passwords
- Do NOT commit `.env.prod` to Git
- Do NOT expose Docker container ports directly (use Nginx)
- Do NOT store sensitive data in logs
- Do NOT skip email verification
- Do NOT run migrations as root user

---

## ✅ POST-DEPLOYMENT

### 12. Smoke Tests
```bash
# 1. Health check
curl https://yourdomain.com/health

# 2. API response
curl https://yourdomain.com/api/tests/is-debug
# Expected: {"is_debug": false}

# 3. Database connectivity
# Try login or any API call that uses DB

# 4. Email sending (if possible)
# Test password reset or send test email

# 5. Payment flow (if enabled)
# Test TsPay integration
```

---

## 📞 TROUBLESHOOTING

### Container won't start
```bash
docker-compose logs backend
# Check SECRET_KEY, DATABASE_URL, required env vars
```

### Database connection error
```bash
docker-compose exec db psql -U $DB_USER -d $DB_NAME -c "SELECT 1;"
# Verify DATABASE_URL format and credentials
```

### Nginx 502 Bad Gateway
```bash
docker-compose ps  # Verify backend is running
curl http://localhost:8000/health  # Test local connection
```

### Port already in use
```bash
# Change port in docker-compose.yml or stop conflicting service
ss -tlnp | grep 8000
```

---

**Last Updated:** April 5, 2026
**Status:** Ready for production deployment review
