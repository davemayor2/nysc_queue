# Admin Panel Guide

## 🔐 Overview

The NYSC Queue Management System now has **two separate interfaces**:

1. **Public Page** (`/`) - For corps members to generate queue numbers
2. **Admin Panel** (`/admin.html`) - For LGA officials to verify and manage queues

---

## 👥 Public Interface (Corps Members)

**URL**: `http://localhost:3000/`

### Features Available:
✅ Enter NYSC State Code  
✅ Generate Queue Number  
✅ View their queue details (number, LGA, date, status)  
✅ See QR code for verification  

### Features NOT Available:
❌ Queue verification  
❌ Statistics  
❌ Reference ID visibility  
❌ Mark as used  

---

## 🛡️ Admin Panel (LGA Officials)

**URL**: `http://localhost:3000/admin.html`

### Access Control

The admin panel is protected by a **4-digit PIN**.

**Default PIN**: `1234`

**To Change the PIN**:
1. Open `public/admin.js`
2. Find line: `const ADMIN_PIN = '1234';`
3. Change to your preferred PIN: `const ADMIN_PIN = '9876';`
4. Save the file
5. Restart the server

### Admin Features

#### 1. **Today's Overview Dashboard**
- Total Queued
- Active Queue Numbers
- Used Queue Numbers
- Current LGA Name

#### 2. **Queue Verification**
- Enter Reference ID (UUID)
- Verify authenticity
- View full queue details:
  - Queue Number
  - State Code
  - LGA
  - Status (Active/Used)
  - Date Created
  - Timestamp

#### 3. **Mark as Used**
- For verified ACTIVE queues
- Click "Mark as USED" button
- Confirmation dialog to prevent accidents
- Cannot be undone
- Updates statistics automatically

---

## 🎯 How to Use Admin Panel

### Step 1: Access Admin Panel

1. Open browser: `http://localhost:3000`
2. Click "Access Admin Panel" link at bottom
3. OR directly visit: `http://localhost:3000/admin.html`

### Step 2: Enter PIN

1. Enter 4-digit PIN: `1234` (default)
2. Click "Submit" or press Enter
3. PIN is remembered for current browser session

### Step 3: Verify Queue Numbers

**Scenario**: Corps member arrives and shows their queue number

1. Ask for their **Reference ID** (shown on their screen)
2. Enter the Reference ID in the verification field
3. Click "Verify Queue"
4. System shows:
   - ✅ Valid - Shows queue details
   - ❌ Invalid - Shows error message

### Step 4: Mark as Used

**After verifying a queue is ACTIVE:**

1. Review queue details carefully
2. Click "Mark as USED" button (red)
3. Confirm the action
4. Queue status changes to USED
5. Statistics update automatically

**Important**: Once marked as USED, it cannot be changed back!

### Step 5: View Statistics

- Dashboard shows real-time stats
- Click "🔄 Refresh Stats" to update
- Stats reset automatically at midnight

### Step 6: Logout

Click "Logout" button to clear session and return to PIN screen

---

## 🔒 Security Features

### PIN Protection
- Required for all admin access
- Session-based (cleared on browser close)
- Shake animation on wrong PIN
- Can be changed in code

### Session Management
- PIN verification stored in `sessionStorage`
- Automatically cleared on:
  - Browser close
  - Tab close
  - Manual logout
  - Page refresh requires re-authentication

### No Backend Authentication (v1)
⚠️ **Note**: Current version uses **client-side PIN** for simplicity.

**For Production**, consider:
- Server-side authentication
- User accounts with passwords
- Session tokens
- Two-factor authentication

---

## 📱 User Workflows

### Workflow 1: Corps Member Queue Generation (Public)

```
1. Open http://localhost:3000
2. Allow GPS access
3. Enter state code (e.g., NY/23A/1234)
4. Click "Generate Queue Number"
5. View queue number and QR code
6. Save queue number for later
```

### Workflow 2: Official Verification (Admin)

```
1. Open http://localhost:3000/admin.html
2. Enter PIN: 1234
3. Corps member arrives
4. Ask for Reference ID
5. Enter Reference ID and verify
6. Review queue details
7. If valid and unused, mark as USED
8. Allow entry
```

---

## 🎨 Customization

### Change Admin PIN

**File**: `public/admin.js`  
**Line**: 10

```javascript
// Change this to your preferred PIN
const ADMIN_PIN = '1234';  // ← Change here
```

### Change PIN Length

Currently supports 4 digits. To change:

**File**: `public/admin.html`  
**Line**: 35

```html
<input 
  type="password" 
  id="pinInput" 
  class="pin-input" 
  placeholder="****"
  maxlength="4"  ← Change this
  autocomplete="off"
>
```

### Add Multiple Admin PINs

**File**: `public/admin.js`

```javascript
// Replace single PIN with array
const ADMIN_PINS = ['1234', '5678', '9999'];

function verifyPIN() {
  const enteredPIN = document.getElementById('pinInput').value;
  
  if (ADMIN_PINS.includes(enteredPIN)) {
    // PIN correct
    // ... rest of code
  }
}
```

---

## 🚨 Troubleshooting

### Cannot Access Admin Panel

**Problem**: Page not loading

**Solution**:
1. Check server is running: `npm run dev`
2. Verify URL: `http://localhost:3000/admin.html`
3. Check browser console for errors (F12)

### PIN Not Working

**Problem**: "Incorrect PIN" error

**Solution**:
1. Default PIN is `1234`
2. Check if PIN was changed in `admin.js`
3. Clear browser cache (Ctrl+Shift+Del)
4. Try in incognito/private window

### Verification Failing

**Problem**: All verifications return "Invalid"

**Solution**:
1. Check database is running
2. Verify Reference ID is correct (UUID format)
3. Check network tab in browser (F12)
4. Ensure queue was created today (queues expire daily)

### Statistics Not Updating

**Problem**: Stats show 0 or incorrect numbers

**Solution**:
1. Click "🔄 Refresh Stats" button
2. Check if any queues were generated today
3. Verify database connection in terminal
4. Restart server if needed

---

## 📊 Production Recommendations

### 1. Enhanced Authentication
- Implement server-side authentication
- Use JWT tokens
- Add user roles (Admin, Viewer, Super Admin)
- Password hashing (bcrypt)

### 2. Audit Logging
- Log all admin actions
- Track who marked queues as used
- Store verification history
- Export logs for review

### 3. Advanced Features
- QR code scanner integration
- Bulk verification
- Queue management (edit, delete)
- Analytics dashboard
- Export to CSV/PDF

### 4. Security Enhancements
- Rate limiting on admin endpoints
- IP whitelisting
- Two-factor authentication
- Session timeout (auto-logout after inactivity)

---

## 📚 Quick Reference

| Feature | Public | Admin |
|---------|--------|-------|
| Generate Queue | ✅ | ❌ |
| View Own Queue | ✅ | ❌ |
| Verify Queue | ❌ | ✅ |
| Mark as Used | ❌ | ✅ |
| View Statistics | ❌ | ✅ |
| See Reference ID | ❌ | ✅ |
| PIN Required | ❌ | ✅ |

---

## 🆘 Support

### For Corps Members
- Use public page only
- Do not try to access admin panel
- Save your queue number
- Show QR code or reference ID to officials

### For LGA Officials
- Memorize admin PIN
- Do not share PIN with corps members
- Verify carefully before marking as used
- Refresh stats regularly

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Default PIN**: 1234 (Change immediately!)
