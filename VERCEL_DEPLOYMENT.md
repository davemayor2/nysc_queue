# 🚀 Vercel Deployment Guide

Complete guide to deploy your NYSC Queue Management System to Vercel.

---

## 📋 Prerequisites

Before deploying to Vercel, you need:

1. ✅ Vercel account (free tier works fine)
2. ✅ PostgreSQL database (we'll set this up)
3. ✅ Your code pushed to GitHub (recommended)

---

## 🗄️ Step 1: Set Up PostgreSQL Database

Vercel doesn't include PostgreSQL, so you need an external database. Here are the best options:

### **Option A: Neon (Recommended - Free Tier Available)**

1. **Sign Up**: Go to [neon.tech](https://neon.tech)
2. **Create Project**: Click "Create Project"
3. **Get Connection String**: 
   ```
   postgres://username:password@ep-xxx.neon.tech/nycsc_queue
   ```
4. **Save this connection string** - you'll need it for Vercel

### **Option B: Supabase (Free Tier Available)**

1. **Sign Up**: Go to [supabase.com](https://supabase.com)
2. **Create Project**: New Project → Choose name
3. **Get Connection String**: Settings → Database → Connection String
4. **Mode**: Use "Session" mode (port 5432)

### **Option C: Vercel Postgres (Paid)**

1. In Vercel Dashboard → Storage → Create Database
2. Select "Postgres"
3. Connection details provided automatically

---

## 📦 Step 2: Prepare Your Project

### A. Install Vercel CLI (Optional but Recommended)

```bash
npm install -g vercel
```

### B. Update package.json

Make sure your `package.json` has these scripts:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "migrate": "node src/database/migrate.js",
    "seed": "node src/database/seed.js",
    "vercel-build": "echo 'Build complete'"
  }
}
```

---

## 🚀 Step 3: Deploy to Vercel

### Method 1: Deploy via GitHub (Recommended)

#### 1. Push to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - NYSC Queue System"

# Create repository on GitHub, then:
git remote add origin https://github.com/yourusername/nysc-queue.git
git branch -M main
git push -u origin main
```

#### 2. Import to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "**Add New...**" → "**Project**"
3. Import your GitHub repository
4. Click "**Import**"

#### 3. Configure Environment Variables

In the Vercel import screen, add these environment variables:

```env
# Database Configuration
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_NAME=nysc_queue
DB_USER=your_username
DB_PASSWORD=your_password

# OR use full connection string (easier)
DATABASE_URL=postgres://user:pass@host.neon.tech/nysc_queue

# Server Configuration
PORT=3000
NODE_ENV=production

# Security
ADMIN_PIN=1234
ALLOWED_ORIGIN=https://your-app-name.vercel.app

# LGA Configuration
DEFAULT_LGA_NAME=Amuwo-Odofin
DEFAULT_LGA_LAT=6.4706
DEFAULT_LGA_LNG=3.2838
DEFAULT_LGA_RADIUS=500
```

#### 4. Deploy

Click "**Deploy**" - Vercel will build and deploy your app!

---

### Method 2: Deploy via Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? nysc-queue-system
# - Directory? ./
# - Override settings? N
```

Then add environment variables:

```bash
# Add all environment variables
vercel env add DB_HOST
vercel env add DB_PORT
vercel env add DB_NAME
vercel env add DB_USER
vercel env add DB_PASSWORD
vercel env add ADMIN_PIN
vercel env add DEFAULT_LGA_NAME
vercel env add DEFAULT_LGA_LAT
vercel env add DEFAULT_LGA_LNG
vercel env add DEFAULT_LGA_RADIUS

# Or use DATABASE_URL
vercel env add DATABASE_URL
```

Deploy to production:

```bash
vercel --prod
```

---

## 🗄️ Step 4: Initialize Database

After deployment, you need to create the database tables.

### Option A: Run Migrations Locally (Recommended)

Update your `.env` temporarily with the production database credentials:

```bash
# In your .env file, temporarily use production DB
DB_HOST=your-neon-host.neon.tech
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=nysc_queue

# Run migrations
npm run migrate

# Seed initial data
npm run seed

# Change .env back to local settings
```

### Option B: Use Database GUI

1. **Connect to your database** using pgAdmin or TablePlus
2. **Run the migration SQL manually**:

```sql
-- Create LGA table
CREATE TABLE IF NOT EXISTS lgas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Corps Members table
CREATE TABLE IF NOT EXISTS corps_members (
  state_code VARCHAR(20) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Queue Entries table
CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code VARCHAR(20) NOT NULL,
  queue_number INTEGER NOT NULL,
  lga_id UUID NOT NULL REFERENCES lgas(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(state_code, date, lga_id),
  UNIQUE(queue_number, lga_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_queue_entries_state_code ON queue_entries(state_code);
CREATE INDEX IF NOT EXISTS idx_queue_entries_date ON queue_entries(date);
CREATE INDEX IF NOT EXISTS idx_queue_entries_lga_date ON queue_entries(lga_id, date);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status);

-- Insert default LGA
INSERT INTO lgas (name, latitude, longitude, radius_meters)
VALUES ('Amuwo-Odofin', 6.4706, 3.2838, 500)
ON CONFLICT (name) DO NOTHING;
```

---

## 🔧 Step 5: Update Database Configuration

Update `src/database/config.js` to support Vercel's DATABASE_URL format:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

// Support both individual credentials and DATABASE_URL
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'nysc_queue',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

// Rest of the file remains the same...
```

---

## 🌐 Step 6: Access Your Deployed App

After deployment completes, Vercel will give you a URL:

```
https://your-app-name.vercel.app
```

### Test the Deployment:

1. **Public Page**: `https://your-app-name.vercel.app/`
2. **Admin Panel**: `https://your-app-name.vercel.app/admin.html`
3. **Health Check**: `https://your-app-name.vercel.app/api/health`

---

## 🔒 Step 7: Configure Custom Domain (Optional)

1. **In Vercel Dashboard**: Go to your project → Settings → Domains
2. **Add Domain**: Enter your domain (e.g., `nysc-queue.yourdomain.com`)
3. **Configure DNS**: Add the CNAME record Vercel provides
4. **Update Environment Variables**:
   ```env
   ALLOWED_ORIGIN=https://nysc-queue.yourdomain.com
   ```

---

## ⚙️ Vercel Configuration Files

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "src/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### .vercelignore
```
node_modules
.env
*.log
.DS_Store
```

---

## 🔄 Continuous Deployment

Once set up with GitHub:

1. **Push changes** to your GitHub repository
2. **Vercel automatically deploys** the new version
3. **Monitor deployment** in Vercel dashboard
4. **Rollback** if needed with one click

```bash
# Make changes
git add .
git commit -m "Update feature"
git push

# Vercel deploys automatically!
```

---

## 🚨 Troubleshooting

### Database Connection Error

**Problem**: Cannot connect to database

**Solution**:
1. Verify DATABASE_URL or DB_* credentials in Vercel environment variables
2. Check database is running (Neon, Supabase)
3. Ensure SSL is enabled for production
4. Check database firewall allows Vercel's IP

### GPS Not Working

**Problem**: Location access denied

**Solution**:
- Vercel provides HTTPS automatically ✅
- GPS should work (requires HTTPS)
- Test on mobile device for best results

### 404 Errors

**Problem**: Routes not working

**Solution**:
1. Check `vercel.json` configuration
2. Ensure all routes are properly configured
3. Check Vercel deployment logs

### Environment Variables Not Working

**Problem**: App can't read environment variables

**Solution**:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add each variable for "Production" environment
3. Redeploy the app

---

## 📊 Monitor Your Deployment

### Vercel Dashboard

1. **Deployments**: View all deployments and their status
2. **Analytics**: Track page views and performance
3. **Logs**: View real-time application logs
4. **Insights**: Monitor performance metrics

### View Logs

```bash
# Via CLI
vercel logs

# Or in Vercel Dashboard → Project → Logs
```

---

## 💰 Pricing

### Vercel
- **Hobby (Free)**: Perfect for this app
  - 100 GB bandwidth/month
  - Serverless functions
  - Automatic HTTPS

### Neon (Database)
- **Free Tier**: 
  - 0.5 GB storage
  - Unlimited queries
  - Perfect for testing

### Supabase (Database)
- **Free Tier**:
  - 500 MB storage
  - Unlimited API requests
  - Good for production

---

## ✅ Deployment Checklist

Before going live:

- [ ] Database created and migrations run
- [ ] LGA seeded with correct coordinates
- [ ] All environment variables set in Vercel
- [ ] Admin PIN changed from default
- [ ] Test queue generation
- [ ] Test geofencing (must be at LGA)
- [ ] Test admin panel access
- [ ] Test queue verification
- [ ] Custom domain configured (optional)
- [ ] SSL/HTTPS working (automatic with Vercel)

---

## 🎓 Post-Deployment Steps

1. **Test thoroughly**: Generate queues, verify, check admin panel
2. **Share URLs**: Public and admin (separately!)
3. **Monitor logs**: Watch for errors in Vercel dashboard
4. **Backup database**: Set up regular backups in Neon/Supabase
5. **Update documentation**: Document your production URL

---

## 🆘 Getting Help

### Vercel Support
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Discord](https://vercel.com/discord)

### Database Support
- [Neon Docs](https://neon.tech/docs)
- [Supabase Docs](https://supabase.com/docs)

---

## 🎉 Quick Deploy Command

```bash
# One-line deploy (after setup)
git add . && git commit -m "Deploy to Vercel" && git push

# Or with CLI
vercel --prod
```

---

**Estimated Setup Time**: 15-20 minutes  
**Difficulty**: Medium ⭐⭐⭐☆☆  
**Cost**: Free (using free tiers)

---

**Last Updated**: February 2, 2026  
**Status**: Ready for Deployment 🚀
