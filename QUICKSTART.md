# 🚀 Quick Start Guide

Get the NYSC Queue Management System running in 5 minutes!

## Prerequisites

- Node.js installed
- PostgreSQL installed and running
- Terminal/Command Prompt access

## 5-Minute Setup

### Step 1: Install Dependencies (1 min)

```bash
npm install
```

### Step 2: Configure Environment (1 min)

```bash
# Copy the example environment file
cp .env.example .env
```

**Edit `.env` file - Change ONLY this line:**
```env
DB_PASSWORD=your_postgres_password_here
```

### Step 3: Setup Database (2 min)

```bash
# Create database
createdb nysc_queue

# Or using psql:
psql -U postgres -c "CREATE DATABASE nysc_queue;"

# Run migrations (creates tables)
npm run migrate

# Add initial LGA data
npm run seed
```

### Step 4: Start Server (30 sec)

```bash
npm run dev
```

### Step 5: Test (30 sec)

1. Open browser: **http://localhost:3000**
2. Allow GPS access
3. Enter state code: **NY/23A/1234**
4. Click "Generate Queue Number"

## ✅ Success!

You should see:
- ✅ GPS Location Acquired
- ✅ Queue Number Generated
- ✅ QR Code Displayed

## 🎯 Test Scenarios

### Scenario 1: Generate Queue (Should Work)
```
State Code: NY/23A/1234
Location: Must be near LGA center
Expected: Queue number generated
```

### Scenario 2: Same State Code Again (Should Work)
```
State Code: NY/23A/1234 (same as before)
Device: Same device
Expected: Returns existing queue number
```

### Scenario 3: Verify Queue Number
```
1. Copy the Reference ID from queue result
2. Scroll to "Verify Queue Number" section
3. Paste Reference ID
4. Click Verify
Expected: Shows queue details
```

## 🔧 Troubleshooting

### Database Connection Error

**Error**: "Cannot connect to database"

**Fix**:
```bash
# Check if PostgreSQL is running
# Windows:
Get-Service postgresql*

# Mac/Linux:
sudo service postgresql status

# If not running, start it:
# Windows: Start-Service postgresql-x64-14
# Mac: brew services start postgresql
# Linux: sudo service postgresql start
```

### GPS Not Working

**Error**: "Location permission denied"

**Fix**:
1. Click the lock icon in browser address bar
2. Set Location permission to "Allow"
3. Refresh the page

### Port Already in Use

**Error**: "Port 3000 is already in use"

**Fix**:
```bash
# Option 1: Use different port
# Edit .env: PORT=3001

# Option 2: Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

## 📱 Using the System

### For Corps Members

1. **Generate Queue**
   - Enter NYSC state code
   - Must be at LGA physically
   - Save queue number and reference ID

2. **Important Notes**
   - One queue per day
   - Cannot share with others
   - Must use same device
   - Valid for today only

### For Officials

1. **Verify Queue**
   - Get reference ID from corps member
   - Enter in verification section
   - Check validity and status

2. **View Statistics**
   - Total queued today
   - Active vs. used numbers
   - Click refresh to update

## 🎓 Understanding the System

### Security Features

1. **GPS Geofencing** 📍
   - Must be within 500m of LGA center
   - Uses precise GPS coordinates
   - Cannot be faked or spoofed

2. **Device Locking** 🔒
   - Queue tied to your device
   - Cannot switch devices
   - Prevents link sharing

3. **Rate Limiting** ⏱️
   - Max 5 queue attempts per 5 minutes
   - Prevents spam and abuse
   - Automatic cooldown

4. **Duplicate Prevention** 🚫
   - One queue per state code per day
   - Database-level constraints
   - Returns existing if duplicate

### How Geofencing Works

```
LGA Center: (6.6018, 3.3515)
Allowed Radius: 500 meters

Your Location: (6.6021, 3.3511)
Distance: ~45 meters
Result: ✅ ALLOWED

Your Location: (6.7000, 3.4000)
Distance: ~15 km
Result: ❌ DENIED (Outside geofence)
```

## 🎯 Common Use Cases

### Use Case 1: First Time User
```
1. Arrive at LGA physically
2. Open application on phone
3. Allow GPS access
4. Enter state code
5. Generate queue number
6. Save reference ID
```

### Use Case 2: Returning User (Same Day)
```
1. Open application
2. Enter same state code
3. System returns existing queue
4. No new number generated
```

### Use Case 3: Official Verification
```
1. Corps member shows reference ID
2. Official enters in system
3. Verify authenticity
4. Optionally mark as "USED"
5. Allow entry
```

## 🔄 Daily Reset

Queue numbers reset automatically at midnight:
- New day = new queue sequence
- Starts from 1 again
- Previous day's queues become invalid

## 📊 System Limits

| Item | Limit |
|------|-------|
| Queue attempts | 5 per 5 minutes |
| Verification attempts | 50 per 10 minutes |
| API requests | 100 per 15 minutes |
| Queue capacity | Unlimited |
| LGA radius | 500 meters (configurable) |

## 🎨 Customization

### Change LGA Location

Edit `.env`:
```env
DEFAULT_LGA_NAME=Surulere
DEFAULT_LGA_LAT=6.4968
DEFAULT_LGA_LNG=3.3564
DEFAULT_LGA_RADIUS=1000
```

Then re-seed:
```bash
npm run seed
```

### Change Geofence Radius

Update database:
```sql
UPDATE lgas SET radius_meters = 1000 WHERE name = 'Ikeja';
```

## 📚 Next Steps

1. **Read Full Documentation**: `README.md`
2. **Production Deployment**: `DEPLOYMENT.md`
3. **Project Structure**: `PROJECT_STRUCTURE.md`
4. **Detailed Setup**: `SETUP.md`

## 🆘 Need Help?

1. Check error message in browser console (F12)
2. Check terminal for server errors
3. Review troubleshooting section above
4. Check `README.md` for detailed docs

## 💡 Pro Tips

- Use Chrome/Firefox for best compatibility
- Allow GPS access immediately
- Keep browser tab open (don't minimize)
- Test with real GPS, not mock locations
- Save reference IDs for verification

---

**Setup Time**: 5 minutes  
**Difficulty**: Beginner-Friendly ⭐☆☆☆☆  
**Status**: Production Ready ✅
