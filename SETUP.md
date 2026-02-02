# Quick Setup Guide

Follow these steps to get the NYSC Queue Management System running:

## Prerequisites Check

Before starting, ensure you have:
- [ ] Node.js (v14+) installed: `node --version`
- [ ] PostgreSQL (v12+) installed: `psql --version`
- [ ] npm installed: `npm --version`

## Step-by-Step Setup

### 1. Install Dependencies (2 minutes)

```bash
npm install
```

Expected output: All packages installed successfully

### 2. Configure Database (3 minutes)

#### Windows (PowerShell)
```powershell
# Start PostgreSQL service
Start-Service postgresql-x64-14

# Create database
psql -U postgres
CREATE DATABASE nysc_queue;
\q
```

#### macOS/Linux
```bash
# Start PostgreSQL
sudo service postgresql start

# Create database
sudo -u postgres psql
CREATE DATABASE nysc_queue;
\q
```

### 3. Setup Environment Variables (1 minute)

```bash
# Copy example file
cp .env.example .env
```

Edit `.env` file with your settings:
- **Required**: Set `DB_PASSWORD` to your PostgreSQL password
- **Optional**: Adjust LGA coordinates if needed

### 4. Initialize Database (1 minute)

```bash
# Run migrations
npm run migrate

# Seed initial data
npm run seed
```

Expected output:
```
✓ LGA table created
✓ Corps Members table created
✓ Queue Entries table created
✓ Seeded LGA: Ikeja
```

### 5. Start the Server (1 minute)

```bash
# Development mode
npm run dev
```

Expected output:
```
🚀 NYSC Queue Management System
Server running on port 3000
Local: http://localhost:3000
```

### 6. Test the Application (2 minutes)

1. Open browser: `http://localhost:3000`
2. Allow GPS access when prompted
3. Enter test state code: `NY/23A/1234`
4. Click "Generate Queue Number"

## Troubleshooting

### Database Connection Error

**Problem**: Cannot connect to database

**Solution**:
1. Check if PostgreSQL is running:
   ```bash
   # Windows
   Get-Service postgresql*
   
   # macOS/Linux
   sudo service postgresql status
   ```

2. Verify `.env` credentials match your PostgreSQL setup

3. Test connection:
   ```bash
   psql -U postgres -d nysc_queue
   ```

### GPS Not Working

**Problem**: Location access denied

**Solution**:
1. Check browser location settings
2. Allow location access for `localhost`
3. For production, use HTTPS (GPS requires secure context)

### Port Already in Use

**Problem**: Port 3000 is already in use

**Solution**:
1. Change port in `.env`:
   ```env
   PORT=3001
   ```

2. Or kill the process using port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   ```

### Module Not Found

**Problem**: Cannot find module errors

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Verification Checklist

After setup, verify:
- [ ] Server starts without errors
- [ ] Can access `http://localhost:3000`
- [ ] GPS location is acquired
- [ ] Can generate queue number
- [ ] Can verify queue number
- [ ] Statistics display correctly

## Next Steps

1. **Configure Your LGA**:
   - Update LGA coordinates in `.env`
   - Run `npm run seed` again

2. **Test Geofencing**:
   - Try generating from different locations
   - Verify boundary enforcement

3. **Production Deployment**:
   - See README.md for production setup
   - Configure HTTPS
   - Set up process manager (PM2)

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run migrate` | Create database tables |
| `npm run seed` | Add initial LGA data |
| `npm run dev` | Start development server |
| `npm start` | Start production server |

## Support

If you encounter issues:
1. Check error messages in terminal
2. Review troubleshooting section above
3. Check README.md for detailed documentation
4. Verify all prerequisites are installed

---

**Setup Time**: ~10 minutes  
**Difficulty**: Easy ⭐⭐☆☆☆
