# NYSC LGA Queue Management System

A secure, location-restricted digital queuing system for NYSC corps members with anti-fraud controls.

## 🎯 Features

- **GPS Geofencing**: Queue numbers can only be generated within LGA boundaries
- **Device Fingerprinting**: Prevents link sharing and device switching
- **Anti-Fraud Controls**: One queue number per corps member per day
- **Real-time Verification**: QR code-based queue verification
- **Rate Limiting**: Prevents brute force and abuse
- **Security-First**: HTTPS enforcement, secure headers, server-side validation

## 🏗️ Architecture

### Backend
- **Node.js + Express**: REST API server
- **PostgreSQL**: Relational database with ACID compliance
- **Security Middleware**: Helmet, CORS, Rate Limiting

### Frontend
- **Vanilla JavaScript**: No framework dependencies
- **GPS API**: Browser Geolocation API
- **Device Fingerprinting**: Custom fingerprinting implementation
- **Responsive Design**: Mobile-first approach

## 📋 Prerequisites

- **Node.js**: v14 or higher
- **PostgreSQL**: v12 or higher
- **npm**: v6 or higher

## 🚀 Installation

### 1. Clone/Download the Project

```bash
cd "NYSC NUMBER QUEUE"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nysc_queue
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Server Configuration
PORT=3000
NODE_ENV=development

# LGA Configuration (Seed Data)
DEFAULT_LGA_NAME=Ikeja
DEFAULT_LGA_LAT=6.6018
DEFAULT_LGA_LNG=3.3515
DEFAULT_LGA_RADIUS=500
```

### 4. Setup Database

#### Create PostgreSQL Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE nysc_queue;

# Exit psql
\q
```

#### Run Migrations

```bash
npm run migrate
```

This creates:
- `lgas` table - LGA locations and boundaries
- `corps_members` table - Corps member records
- `queue_entries` table - Queue number records

#### Seed Initial Data

```bash
npm run seed
```

This populates:
- Default LGA (Ikeja, Lagos) with geofence configuration

### 5. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start at `http://localhost:3000`

## 📱 Usage

### For Corps Members

1. **Open the Application**
   - Navigate to `http://localhost:3000` in your browser
   - Allow GPS location access when prompted

2. **Generate Queue Number**
   - Enter your NYSC state code (e.g., `NY/23A/1234`)
   - Ensure you are physically within the LGA boundary
   - Click "Generate Queue Number"

3. **Save Your Queue Number**
   - Your queue number will be displayed with a QR code
   - Save the reference ID for verification
   - Do not share links or screenshots

### For LGA Officials

1. **Verify Queue Numbers**
   - Scroll to the "Verify Queue Number" section
   - Enter the reference ID or scan QR code
   - Click "Verify" to check authenticity

2. **View Statistics**
   - Check "Today's Statistics" section
   - See total queued, active, and used numbers
   - Click "Refresh" to update

## 🔒 Security Features

### 1. Geofencing (GPS-Based)
```javascript
// Haversine formula calculates distance
// User must be within configured radius
DEFAULT_LGA_RADIUS=500  // 500 meters
```

### 2. Device Fingerprinting
Collects:
- User agent
- Platform/OS
- Screen resolution
- Timezone
- Canvas fingerprint

### 3. Anti-Fraud Controls
- ✅ One queue per state code per day
- ✅ Device locking (cannot switch devices)
- ✅ No link sharing
- ✅ Server-side validation only
- ✅ Rate limiting on all endpoints

### 4. Rate Limiting
- General API: 100 requests per 15 minutes
- Queue Generation: 5 attempts per 5 minutes
- Verification: 50 requests per 10 minutes

## 📡 API Documentation

### Generate Queue Number

**Endpoint**: `POST /api/queue/generate`

**Request Body**:
```json
{
  "state_code": "NY/23A/1234",
  "latitude": 6.6021,
  "longitude": 3.3511,
  "device_info": {
    "userAgent": "...",
    "platform": "...",
    "screenResolution": "1920x1080",
    "timezone": "Africa/Lagos",
    "language": "en-US"
  }
}
```

**Success Response** (201):
```json
{
  "success": true,
  "queue_number": 28,
  "lga": "Ikeja",
  "reference_id": "uuid",
  "status": "ACTIVE",
  "date": "2026-02-01",
  "qr_code": "data:image/png;base64,..."
}
```

**Error Responses**:
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Device mismatch
- `403 Forbidden` - Outside geofence
- `429 Too Many Requests` - Rate limit exceeded

### Verify Queue Number

**Endpoint**: `POST /api/queue/verify`

**Request Body**:
```json
{
  "reference_id": "uuid",
  "mark_used": false
}
```

**Success Response** (200):
```json
{
  "valid": true,
  "queue_number": 28,
  "state_code": "NY/23A/1234",
  "lga": "Ikeja",
  "status": "ACTIVE",
  "date": "2026-02-01"
}
```

### Get Statistics

**Endpoint**: `GET /api/queue/stats`

**Success Response** (200):
```json
{
  "date": "2026-02-01",
  "stats": {
    "lga_name": "Ikeja",
    "total_queued": 50,
    "active": 45,
    "used": 5,
    "highest_number": 50
  }
}
```

## 🗄️ Database Schema

### LGAs Table
```sql
CREATE TABLE lgas (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Corps Members Table
```sql
CREATE TABLE corps_members (
  state_code VARCHAR(20) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Queue Entries Table
```sql
CREATE TABLE queue_entries (
  id UUID PRIMARY KEY,
  state_code VARCHAR(20) NOT NULL,
  queue_number INTEGER NOT NULL,
  lga_id UUID NOT NULL REFERENCES lgas(id),
  device_fingerprint VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(state_code, date, lga_id),
  UNIQUE(queue_number, lga_id, date)
);
```

## 🧪 Testing

### Test Queue Generation

1. **Within Geofence** (Should succeed):
   - Use GPS coordinates near LGA center
   - Example: Ikeja (6.6018, 3.3515)

2. **Outside Geofence** (Should fail):
   - Use GPS coordinates far from LGA
   - Example: Abuja (9.0765, 7.3986)

3. **Duplicate State Code** (Should return existing):
   - Use same state code on same device
   - Should receive existing queue number

4. **Device Mismatch** (Should fail):
   - Change device fingerprint
   - Should receive 401 Unauthorized

### Test Rate Limiting

```bash
# Send multiple requests quickly
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/queue/generate \
    -H "Content-Type: application/json" \
    -d '{"state_code":"NY/23A/1234",...}'
done
```

## 🛠️ Customization

### Add New LGA

```sql
INSERT INTO lgas (name, latitude, longitude, radius_meters)
VALUES ('Surulere', 6.4968, 3.3564, 500);
```

### Change Geofence Radius

Update the `.env` file:
```env
DEFAULT_LGA_RADIUS=1000  # 1 kilometer
```

Or update database:
```sql
UPDATE lgas SET radius_meters = 1000 WHERE name = 'Ikeja';
```

### Modify Rate Limits

Edit `src/middleware/rateLimiter.js`:
```javascript
const queueGenerationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // Time window
  max: 5,                    // Max requests
  // ...
});
```

## 📊 Monitoring

### View Security Logs

```bash
# Logs are printed to console
[SECURITY] 2026-02-01T10:30:45.123Z | IP: 192.168.1.100 | Action: QUEUE_GENERATION | Result: SUCCESS
```

### Database Queries

```sql
-- Today's queue entries
SELECT * FROM queue_entries WHERE date = CURRENT_DATE;

-- Active queue numbers
SELECT * FROM queue_entries WHERE status = 'ACTIVE' AND date = CURRENT_DATE;

-- Corps members registered today
SELECT COUNT(*) FROM queue_entries WHERE date = CURRENT_DATE;
```

## 🚨 Troubleshooting

### GPS Location Not Working
- Ensure browser has location permissions
- Use HTTPS in production (required for GPS)
- Check if GPS is enabled on device

### Database Connection Failed
- Verify PostgreSQL is running: `psql -U postgres`
- Check `.env` credentials
- Ensure database exists: `CREATE DATABASE nysc_queue;`

### Rate Limit Errors
- Wait for the specified time period
- Clear rate limit cache (restart server in development)

### Outside Geofence Error
- Verify LGA coordinates in database
- Check radius configuration
- Test with correct GPS coordinates

## 📦 Production Deployment

### 1. Environment Setup
```env
NODE_ENV=production
ALLOWED_ORIGIN=https://yourdomain.com
```

### 2. HTTPS Configuration
- Use reverse proxy (Nginx/Apache)
- Configure SSL certificate
- Redirect HTTP to HTTPS

### 3. Database Optimization
```sql
-- Add indexes for performance
CREATE INDEX idx_queue_date ON queue_entries(date);
CREATE INDEX idx_queue_status ON queue_entries(status);
```

### 4. Process Manager
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/server.js --name nysc-queue

# Enable auto-restart on reboot
pm2 startup
pm2 save
```

## 🤝 Contributing

This is a production system. Any changes must:
1. Maintain security requirements
2. Pass all validation tests
3. Follow the PRD specifications
4. Be thoroughly tested

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues or questions:
1. Check troubleshooting section
2. Review API documentation
3. Check database schema
4. Contact system administrator

## 🔐 Security Notes

- **NEVER** commit `.env` file
- **ALWAYS** use HTTPS in production
- **REGULARLY** backup database
- **MONITOR** security logs
- **UPDATE** dependencies regularly

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Status**: Production Ready ✅
