# Project Structure

Complete overview of the NYSC Queue Management System architecture.

## 📁 Directory Structure

```
NYSC NUMBER QUEUE/
├── src/                          # Backend source code
│   ├── database/                 # Database configuration & migrations
│   │   ├── config.js            # PostgreSQL connection pool
│   │   ├── migrate.js           # Database migration script
│   │   └── seed.js              # Seed initial LGA data
│   │
│   ├── middleware/              # Express middleware
│   │   ├── rateLimiter.js       # Rate limiting configuration
│   │   └── security.js          # Security middleware (HTTPS, headers)
│   │
│   ├── routes/                  # API route handlers
│   │   └── queue.js             # Queue generation & verification endpoints
│   │
│   ├── utils/                   # Utility functions
│   │   ├── fingerprint.js       # Device fingerprinting
│   │   ├── geofencing.js        # GPS distance calculations
│   │   └── validation.js        # Input validation
│   │
│   └── server.js                # Main Express server
│
├── public/                      # Frontend files
│   ├── index.html               # Main HTML interface
│   ├── styles.css               # CSS styling
│   ├── app.js                   # Main application logic
│   └── fingerprint.js           # Client-side fingerprinting
│
├── node_modules/                # Dependencies (git-ignored)
│
├── .env                         # Environment variables (git-ignored)
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── package.json                 # Node.js dependencies & scripts
├── package-lock.json            # Dependency lock file
│
├── README.md                    # Main documentation
├── SETUP.md                     # Quick setup guide
├── DEPLOYMENT.md                # Production deployment guide
└── PROJECT_STRUCTURE.md         # This file
```

## 🔧 Core Components

### Backend Components

#### 1. **Database Layer** (`src/database/`)
- **config.js**: PostgreSQL connection pooling
- **migrate.js**: Creates tables with constraints
- **seed.js**: Populates initial LGA data

**Tables Created**:
- `lgas` - LGA locations and geofence boundaries
- `corps_members` - Corps member registry
- `queue_entries` - Queue numbers with device fingerprints

#### 2. **Middleware** (`src/middleware/`)
- **rateLimiter.js**: Prevents brute force attacks
  - General API: 100 req/15min
  - Queue Generation: 5 req/5min
  - Verification: 50 req/10min

- **security.js**: Security enforcement
  - HTTPS validation
  - Header validation
  - Sensitive data protection

#### 3. **API Routes** (`src/routes/queue.js`)

**Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/queue/generate` | Generate queue number |
| POST | `/api/queue/verify` | Verify queue number |
| GET | `/api/queue/stats` | Get today's statistics |

**Security Validations** (in order):
1. State code format validation
2. GPS coordinates validation
3. Device info validation
4. Geofence check
5. Duplicate entry check
6. Device fingerprint match

#### 4. **Utilities** (`src/utils/`)

**geofencing.js**:
- Haversine formula implementation
- Distance calculation
- Boundary validation

**fingerprint.js**:
- SHA-256 hash generation
- Device characteristic collection
- Fingerprint validation

**validation.js**:
- State code pattern matching
- GPS coordinate validation
- UUID validation
- Input sanitization

#### 5. **Main Server** (`src/server.js`)
- Express app configuration
- Security middleware setup
- Route mounting
- Error handling
- Static file serving

### Frontend Components

#### 1. **HTML Interface** (`public/index.html`)

**Sections**:
- Queue generation form
- Queue result display
- Error display
- Verification interface
- Statistics dashboard

**Features**:
- Responsive design
- Accessible UI
- Clear error messages
- QR code display

#### 2. **Styling** (`public/styles.css`)
- Modern, clean design
- NYSC color scheme (green)
- Mobile-responsive
- Animated transitions
- Accessibility features

#### 3. **Application Logic** (`public/app.js`)

**Core Functions**:
```javascript
requestLocation()          // GPS acquisition
handleQueueGeneration()    // Form submission
showQueueResult()          // Display queue number
handleVerification()       // Verify queue
loadStats()               // Load statistics
```

**State Management**:
- `userLocation` - GPS coordinates
- `deviceInfo` - Device fingerprint
- Section visibility management

#### 4. **Fingerprinting** (`public/fingerprint.js`)

**Collected Data**:
- User agent
- Platform/OS
- Screen resolution
- Timezone
- Language
- Canvas fingerprint
- Hardware info

## 🔐 Security Architecture

### Multi-Layer Security

```
User Request
    ↓
[1] Rate Limiter → Block excessive requests
    ↓
[2] Security Headers → Set HTTPS, CSP
    ↓
[3] Input Validation → Sanitize & validate
    ↓
[4] Geofencing → Check GPS location
    ↓
[5] Device Fingerprint → Verify device
    ↓
[6] Database Constraints → Prevent duplicates
    ↓
Response
```

### Security Features Matrix

| Feature | Frontend | Backend | Database |
|---------|----------|---------|----------|
| GPS Validation | Browser API | Haversine | Stored coords |
| Device Lock | Fingerprint | Hash compare | Unique constraint |
| Rate Limiting | - | Express middleware | - |
| Duplicate Prevention | - | Query check | Unique constraint |
| Input Sanitization | HTML5 validation | Server-side | Prepared statements |
| HTTPS Enforcement | - | Middleware | - |

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│      LGAs       │
├─────────────────┤
│ id (PK)         │
│ name (UNIQUE)   │
│ latitude        │
│ longitude       │
│ radius_meters   │
└─────────────────┘
        │
        │ 1:N
        ↓
┌─────────────────┐     ┌──────────────────┐
│ queue_entries   │ N:1 │ corps_members    │
├─────────────────┤────→├──────────────────┤
│ id (PK)         │     │ state_code (PK)  │
│ state_code (FK) │     │ created_at       │
│ queue_number    │     └──────────────────┘
│ lga_id (FK)     │
│ device_fp       │
│ latitude        │
│ longitude       │
│ status          │
│ date            │
└─────────────────┘
```

### Key Constraints

1. **One Queue Per Day**: `UNIQUE(state_code, date, lga_id)`
2. **Unique Queue Numbers**: `UNIQUE(queue_number, lga_id, date)`
3. **Device Locking**: Device fingerprint stored and validated
4. **Status Check**: `CHECK (status IN ('ACTIVE', 'USED'))`

## 🔄 Request Flow

### Queue Generation Flow

```
1. User opens page
   ↓
2. Browser requests GPS location
   ↓
3. Frontend collects device fingerprint
   ↓
4. User enters state code
   ↓
5. Form submits to /api/queue/generate
   ↓
6. Backend validates all inputs
   ↓
7. Check geofence boundary
   ↓
8. Check for existing queue (same device = return existing)
   ↓
9. Generate new queue number (atomic)
   ↓
10. Create QR code
   ↓
11. Return queue number to frontend
   ↓
12. Display queue with instructions
```

### Verification Flow

```
1. Official enters reference ID
   ↓
2. Submit to /api/queue/verify
   ↓
3. Look up queue entry in database
   ↓
4. Validate date (must be today)
   ↓
5. Optionally mark as USED
   ↓
6. Return verification result
```

## 📊 Data Flow Diagram

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└─────┬───────┘
      │
      │ HTTP/JSON
      ↓
┌─────────────────────────────┐
│   Express Server            │
│   ┌─────────────────────┐   │
│   │ Security Middleware │   │
│   └─────────┬───────────┘   │
│             ↓               │
│   ┌─────────────────────┐   │
│   │  Rate Limiter       │   │
│   └─────────┬───────────┘   │
│             ↓               │
│   ┌─────────────────────┐   │
│   │  API Routes         │   │
│   │  - Validate         │   │
│   │  - Geofence         │   │
│   │  - Fingerprint      │   │
│   └─────────┬───────────┘   │
└─────────────┼───────────────┘
              │
              │ SQL Queries
              ↓
      ┌───────────────┐
      │  PostgreSQL   │
      │   Database    │
      └───────────────┘
```

## 🎯 Key Features Implementation

### 1. Geofencing
- **Algorithm**: Haversine formula
- **Accuracy**: ±500 meters (configurable)
- **Implementation**: `src/utils/geofencing.js`

### 2. Device Fingerprinting
- **Method**: Multi-factor device characteristics
- **Hash**: SHA-256
- **Implementation**: `public/fingerprint.js` + `src/utils/fingerprint.js`

### 3. Anti-Fraud
- **Database Level**: UNIQUE constraints
- **Application Level**: Device matching
- **Rate Limiting**: Per IP + state code

### 4. Queue Number Generation
- **Method**: Auto-increment per LGA per day
- **Reset**: Daily at midnight (automatic via date field)
- **Atomicity**: Database transaction

## 📦 Dependencies

### Backend
```json
{
  "express": "Web framework",
  "pg": "PostgreSQL client",
  "helmet": "Security headers",
  "cors": "CORS management",
  "express-rate-limit": "Rate limiting",
  "qrcode": "QR code generation",
  "uuid": "UUID generation",
  "dotenv": "Environment variables"
}
```

### Frontend
- **No external dependencies**
- Vanilla JavaScript
- Native browser APIs (GPS, Canvas)

## 🧪 Testing Strategy

### Manual Testing

1. **Geofencing**:
   - Test inside boundary → Success
   - Test outside boundary → 403 Forbidden

2. **Device Locking**:
   - Same device, same state code → Return existing
   - Different device, same state code → 401 Unauthorized

3. **Rate Limiting**:
   - Rapid requests → 429 Too Many Requests

4. **Duplicate Prevention**:
   - Same state code on same day → Return existing

### API Testing

```bash
# Test queue generation
curl -X POST http://localhost:3000/api/queue/generate \
  -H "Content-Type: application/json" \
  -d '{
    "state_code": "NY/23A/1234",
    "latitude": 6.6018,
    "longitude": 3.3515,
    "device_info": {...}
  }'

# Test verification
curl -X POST http://localhost:3000/api/queue/verify \
  -H "Content-Type: application/json" \
  -d '{"reference_id": "uuid-here"}'

# Test statistics
curl http://localhost:3000/api/queue/stats
```

## 🚀 Performance Considerations

### Database Indexes
- `state_code` - Fast lookup
- `date` - Daily queries
- `lga_id, date` - Queue number generation
- `status` - Active/used filtering
- `device_fingerprint` - Device validation

### Connection Pooling
- Max 20 concurrent connections
- 30s idle timeout
- 2s connection timeout

### Caching Opportunities (Future)
- LGA configuration (rarely changes)
- Device fingerprints (session-based)

## 📈 Scalability

### Current Capacity
- **Concurrent Users**: 500+
- **Daily Queue Capacity**: Unlimited
- **API Response Time**: <2 seconds

### Scaling Options
1. **Horizontal**: Multiple app instances + load balancer
2. **Database**: Read replicas for statistics
3. **Caching**: Redis for session data
4. **CDN**: Static file delivery

## 🔍 Monitoring Points

### Application Metrics
- Request rate per endpoint
- Response times
- Error rates
- Rate limit hits

### Database Metrics
- Connection pool usage
- Query execution time
- Table sizes
- Index performance

### Security Metrics
- Failed authentication attempts
- Geofence violations
- Device mismatches
- Rate limit blocks

---

**Version**: 1.0.0  
**Architecture**: Monolithic (Backend + Frontend)  
**Database**: PostgreSQL  
**Deployment**: VPS, Heroku, or Docker
