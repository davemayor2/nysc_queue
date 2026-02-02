# ⚡ Vercel Quick Start (5 Steps)

Deploy your NYSC Queue System to Vercel in 5 simple steps!

---

## 📋 What You Need

- Vercel account (free): [vercel.com/signup](https://vercel.com/signup)
- GitHub account (free): [github.com](https://github.com)
- Neon database account (free): [neon.tech](https://neon.tech)

---

## 🚀 Step 1: Create Database (2 minutes)

### Sign up for Neon (Free PostgreSQL)

1. Go to **[neon.tech](https://neon.tech)**
2. Click "**Sign Up**" (use GitHub login)
3. Click "**Create Project**"
4. **Copy the connection string**:
   ```
   postgres://user:pass@ep-xxx.neon.tech/dbname
   ```
5. **Save it** - you'll need this!

---

## 📤 Step 2: Push to GitHub (3 minutes)

### Initialize Git and Push

```bash
# Navigate to your project folder
cd "C:\Users\USER\Documents\NYSC NUMBER QUEUE"

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - NYSC Queue System"

# Create new repository on GitHub at: github.com/new
# Then connect and push:
git remote add origin https://github.com/YOUR_USERNAME/nysc-queue.git
git branch -M main
git push -u origin main
```

---

## 🌐 Step 3: Deploy to Vercel (3 minutes)

### Import from GitHub

1. Go to **[vercel.com/new](https://vercel.com/new)**
2. Click "**Import Git Repository**"
3. Select your **nysc-queue** repository
4. Click "**Import**"

### Add Environment Variables

Before clicking Deploy, add these variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `NODE_ENV` | `production` |
| `ADMIN_PIN` | `1234` (change later!) |
| `DEFAULT_LGA_NAME` | `Amuwo-Odofin` |
| `DEFAULT_LGA_LAT` | `6.4706` |
| `DEFAULT_LGA_LNG` | `3.2838` |
| `DEFAULT_LGA_RADIUS` | `500` |

5. Click "**Deploy**"

⏳ Wait 1-2 minutes for deployment...

---

## 🗄️ Step 4: Initialize Database (2 minutes)

### Option A: Using Your Local Machine

Update your `.env` file temporarily:

```env
DATABASE_URL=postgres://user:pass@ep-xxx.neon.tech/dbname
```

Then run:

```bash
npm run migrate
npm run seed
```

Change `.env` back to local settings after!

### Option B: Using SQL Console

1. Go to your **Neon Dashboard**
2. Click "**SQL Editor**"
3. Copy and paste this SQL:

```sql
-- Create tables
CREATE TABLE lgas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE corps_members (
  state_code VARCHAR(20) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code VARCHAR(20) NOT NULL,
  queue_number INTEGER NOT NULL,
  lga_id UUID NOT NULL REFERENCES lgas(id),
  device_fingerprint VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(state_code, date, lga_id),
  UNIQUE(queue_number, lga_id, date)
);

-- Create indexes
CREATE INDEX idx_queue_entries_state_code ON queue_entries(state_code);
CREATE INDEX idx_queue_entries_date ON queue_entries(date);
CREATE INDEX idx_queue_entries_lga_date ON queue_entries(lga_id, date);
CREATE INDEX idx_queue_entries_status ON queue_entries(status);

-- Insert LGA
INSERT INTO lgas (name, latitude, longitude, radius_meters)
VALUES ('Amuwo-Odofin', 6.4706, 3.2838, 500);
```

4. Click "**Run**"

---

## ✅ Step 5: Test Your Deployment (1 minute)

### Get Your URL

Vercel gives you a URL like:
```
https://nysc-queue-abc123.vercel.app
```

### Test It

1. **Public Page**: `https://your-url.vercel.app/`
   - Try generating a queue number
   
2. **Admin Panel**: `https://your-url.vercel.app/admin.html`
   - PIN: `1234`
   - Verify queue numbers

3. **Health Check**: `https://your-url.vercel.app/api/health`
   - Should return: `{"status": "healthy"}`

---

## 🎉 You're Live!

Your NYSC Queue Management System is now deployed!

**Public URL**: Share with corps members  
**Admin URL**: Share with officials only (+ PIN)

---

## 🔄 Future Updates

### To Deploy Updates:

```bash
# Make your changes
git add .
git commit -m "Update feature"
git push

# Vercel automatically deploys! 🚀
```

---

## 🔐 Security Checklist

Before going live:

- [ ] Change ADMIN_PIN from `1234`
- [ ] Test geofencing (must be at LGA)
- [ ] Test queue generation
- [ ] Test admin verification
- [ ] Share URLs separately (public vs admin)

---

## 🆘 Troubleshooting

### "Cannot connect to database"
- Check DATABASE_URL is correct in Vercel dashboard
- Verify database is running in Neon

### "GPS not working"
- HTTPS is automatic on Vercel ✅
- Test on mobile device
- Allow location permissions

### "404 Error"
- Check deployment logs in Vercel
- Ensure `vercel.json` is in repository

---

## 📚 Need More Help?

- **Full Guide**: See `VERCEL_DEPLOYMENT.md`
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Neon Docs**: [neon.tech/docs](https://neon.tech/docs)

---

**Total Time**: ~15 minutes  
**Cost**: $0 (Free tier)  
**Difficulty**: Easy ⭐⭐☆☆☆

🎊 **Congratulations! You're deployed!** 🎊
