# One Device Per Day - Implementation Complete

## What Changed

Your NYSC Queue System now enforces **one queue number per device per day** - regardless of state code, browser, or search engine.

---

## How It Works

### Triple-Layer Device Identification

1. **Device Fingerprint** (Primary)
   - Browser-specific: userAgent, platform, screen, timezone, language
   - Same browser on same device = same fingerprint

2. **Stable Device Fingerprint** (Cross-Browser)
   - Excludes userAgent - uses hardware/screen attributes
   - Same device, different browsers (Chrome, Firefox, Safari) = same stable fingerprint
   - Prevents: Get queue in Chrome → Try again in Firefox → Blocked

3. **Client IP Address** (Fallback)
   - Same phone on same network = same IP
   - Catches edge cases where fingerprint might vary

### Enforcement Logic

When someone tries to generate a queue:
1. Check: Has this device (any of the 3 identifiers) already generated a queue today?
2. If YES → **403 Forbidden** + Show their existing queue
3. If NO → Proceed with normal validation (state code, geofence, etc.)

---

## Files Modified

### Backend
- **src/routes/queue.js** - Added device-per-day check, stores stable fingerprint + IP
- **src/utils/fingerprint.js** - Added `generateStableFingerprint()` for cross-browser ID
- **src/database/migrate-device-limit.js** - New migration script
- **src/database/migrations/add-device-limit.sql** - Manual SQL migration

### Frontend
- **public/fingerprint.js** - Added canvas to metadata for stable fingerprint
- **public/app.js** - Handle "device already used" error, show existing queue

### Config
- **package.json** - Added `migrate:device-limit` script

---

## Database Migration Required

You need to add two new columns to `queue_entries`:

### Option 1: Run Migration Script

```bash
npm run migrate:device-limit
```

### Option 2: Run SQL Manually (Neon SQL Editor)

1. Go to your **Neon Dashboard** → **SQL Editor**
2. Copy and paste this SQL:

```sql
-- Add device_stable_fingerprint
ALTER TABLE queue_entries 
ADD COLUMN IF NOT EXISTS device_stable_fingerprint VARCHAR(255);

-- Add client_ip
ALTER TABLE queue_entries 
ADD COLUMN IF NOT EXISTS client_ip VARCHAR(45);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_queue_entries_device_stable 
ON queue_entries(device_stable_fingerprint);

CREATE INDEX IF NOT EXISTS idx_queue_entries_client_ip 
ON queue_entries(client_ip);
```

3. Click **Run**

---

## User Experience

### Scenario 1: First Queue (Allowed)
- User generates queue with NY/23A/1234
- Success

### Scenario 2: Same Device, Different State Code (Blocked)
- User already got queue with NY/23A/1234
- Tries again with NY/23B/5678
- **Blocked** with message showing their existing queue

### Scenario 3: Same Device, Different Browser (Blocked)
- User got queue in Chrome
- Opens Firefox, tries different state code
- **Blocked** (stable fingerprint matches)

### Scenario 4: Same Device, Different Day (Allowed)
- User got queue yesterday
- Today tries again
- **Allowed** (new queue number)

---

## Error Message Shown

When device is already used:

```
This device has already generated a queue number today

Each phone can only generate one queue number per day, regardless of browser or state code.

Your existing queue:
Queue Number: 015
State Code: NY/23A/1234
LGA: Amuwo-Odofin
Status: ACTIVE
```

---

## Testing

### Test 1: Same Device, Different State Code
1. Generate queue with NY/23A/1234
2. Try to generate with NY/23B/5678
3. **Expected**: Blocked, shown existing queue

### Test 2: Different Browser (Same Device)
1. Generate queue in Chrome
2. Open Firefox (or Edge), try any state code
3. **Expected**: Blocked (stable fingerprint)

### Test 3: Incognito/Private Mode
- May or may not be blocked (fingerprint can vary in private mode)
- IP fallback should still catch it if on same network

---

## Deployment (Vercel)

1. **Run the migration** on your Neon database (SQL Editor)
2. **Push to GitHub** - Vercel will auto-deploy
3. **Test** on production URL

No environment variable changes needed.

---

## Security Notes

- **Device fingerprint** is hashed (SHA-256) - not reversible
- **IP address** stored for matching only
- **No PII** in fingerprints - just device characteristics
- **Privacy**: Same security as before, just stricter limits

---

## Rollback (If Needed)

To remove the device limit:

```sql
ALTER TABLE queue_entries DROP COLUMN IF EXISTS device_stable_fingerprint;
ALTER TABLE queue_entries DROP COLUMN IF EXISTS client_ip;
```

Then revert the queue.js changes. (Not recommended - the limit prevents abuse!)

---

## Summary

| Before | After |
|--------|-------|
| One queue per state code per day | One queue per **device** per day |
| Could use different state codes for multiple queues | Blocked - one queue per phone |
| Same browser only | Same device (any browser) |
| No IP tracking | IP as fallback |

**Result**: Each physical phone can only generate ONE queue number per day, regardless of how many state codes they try or which browser they use.

---

**Status**: ✅ Implementation Complete  
**Migration**: Required (run SQL in Neon)  
**Testing**: Ready
