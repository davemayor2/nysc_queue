# Production Deployment Guide

This guide covers deploying the NYSC Queue Management System to production.

## 🎯 Pre-Deployment Checklist

### Security
- [ ] HTTPS/SSL certificate configured
- [ ] Environment variables set securely
- [ ] Database passwords are strong and unique
- [ ] CORS configured for specific domain
- [ ] Rate limiting enabled
- [ ] Security headers configured (Helmet)

### Database
- [ ] PostgreSQL production instance ready
- [ ] Database backups configured
- [ ] Indexes created for performance
- [ ] Connection pooling optimized

### Server
- [ ] Domain name configured
- [ ] DNS records pointing to server
- [ ] Firewall rules configured
- [ ] Monitoring/logging setup

## 🚀 Deployment Options

### Option 1: VPS Deployment (DigitalOcean, Linode, AWS EC2)

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 2. Deploy Application

```bash
# Create application directory
sudo mkdir -p /var/www/nysc-queue
cd /var/www/nysc-queue

# Clone/upload your application files
# (Use git, scp, or rsync)

# Install dependencies (production only)
npm install --production

# Create .env file
sudo nano .env
```

**.env Configuration**:
```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nysc_queue
DB_USER=nysc_user
DB_PASSWORD=your_secure_password_here

# Security
ALLOWED_ORIGIN=https://yourdomain.com

# LGA Config
DEFAULT_LGA_NAME=Ikeja
DEFAULT_LGA_LAT=6.6018
DEFAULT_LGA_LNG=3.3515
DEFAULT_LGA_RADIUS=500
```

#### 3. Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create production database and user
CREATE DATABASE nysc_queue;
CREATE USER nysc_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE nysc_queue TO nysc_user;
\q

# Run migrations
npm run migrate

# Seed initial data
npm run seed
```

#### 4. Configure Nginx (Reverse Proxy)

```bash
sudo nano /etc/nginx/sites-available/nysc-queue
```

Add configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/nysc-queue /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

#### 6. Start Application with PM2

```bash
# Start application
pm2 start src/server.js --name nysc-queue

# Configure auto-start on reboot
pm2 startup
pm2 save

# Monitor application
pm2 status
pm2 logs nysc-queue
pm2 monit
```

### Option 2: Heroku Deployment

#### 1. Prepare Application

Add `Procfile`:
```
web: node src/server.js
```

#### 2. Deploy to Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create nysc-queue-app

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DEFAULT_LGA_NAME=Ikeja
heroku config:set DEFAULT_LGA_LAT=6.6018
heroku config:set DEFAULT_LGA_LNG=3.3515
heroku config:set DEFAULT_LGA_RADIUS=500

# Deploy
git push heroku main

# Run migrations
heroku run npm run migrate
heroku run npm run seed

# Open app
heroku open
```

### Option 3: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=nysc_queue
      - DB_USER=postgres
      - DB_PASSWORD=secure_password
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=nysc_queue
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 3. Deploy with Docker

```bash
# Build and start
docker-compose up -d

# Run migrations
docker-compose exec app npm run migrate
docker-compose exec app npm run seed

# View logs
docker-compose logs -f app
```

## 🔐 Security Hardening

### 1. Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Database Security

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Allow only local connections
# Change: host all all 0.0.0.0/0 md5
# To: host all all 127.0.0.1/32 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3. Fail2Ban (Brute Force Protection)

```bash
# Install
sudo apt install -y fail2ban

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 📊 Monitoring & Logging

### 1. PM2 Monitoring

```bash
# Install PM2 web monitoring
pm2 install pm2-server-monit

# View metrics
pm2 web
```

### 2. Application Logs

```bash
# View PM2 logs
pm2 logs nysc-queue --lines 100

# Save logs to file
pm2 logs nysc-queue > app.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 3. Database Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('nysc_queue'));
```

## 🔄 Backup Strategy

### Automated Database Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-nysc-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/nysc-queue"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Dump database
pg_dump -U nysc_user nysc_queue | gzip > $BACKUP_DIR/nysc_queue_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: nysc_queue_$DATE.sql.gz"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-nysc-db.sh

# Schedule daily backup (cron)
crontab -e

# Add line (runs daily at 2 AM)
0 2 * * * /usr/local/bin/backup-nysc-db.sh
```

## 🚨 Disaster Recovery

### Database Restore

```bash
# Restore from backup
gunzip < /var/backups/nysc-queue/nysc_queue_YYYYMMDD.sql.gz | psql -U nysc_user nysc_queue
```

### Application Rollback

```bash
# With PM2
pm2 stop nysc-queue
pm2 delete nysc-queue

# Deploy previous version
cd /var/www/nysc-queue
git checkout <previous-commit>
npm install --production
pm2 start src/server.js --name nysc-queue
```

## ✅ Post-Deployment Verification

- [ ] Application accessible via HTTPS
- [ ] GPS location working on HTTPS
- [ ] Queue generation successful
- [ ] Geofencing enforced correctly
- [ ] Device fingerprinting working
- [ ] Rate limiting active
- [ ] Database backups running
- [ ] Monitoring/logs accessible
- [ ] SSL certificate valid
- [ ] Security headers present

## 📈 Performance Optimization

### Database Indexes

```sql
-- Additional indexes for production
CREATE INDEX CONCURRENTLY idx_queue_entries_lga_date_status 
ON queue_entries(lga_id, date, status);

CREATE INDEX CONCURRENTLY idx_queue_entries_created_at 
ON queue_entries(created_at);
```

### Node.js Optimization

```javascript
// Adjust in server.js for production
app.set('trust proxy', 1);
process.env.NODE_ENV = 'production';
```

## 🆘 Troubleshooting

### High CPU Usage
```bash
pm2 monit
top
htop
```

### Memory Leaks
```bash
pm2 restart nysc-queue
```

### Database Connection Pool Exhausted
- Increase `max` in `src/database/config.js`
- Check for unclosed connections

---

**Last Updated**: February 2026  
**Deployment Difficulty**: Medium ⭐⭐⭐☆☆
