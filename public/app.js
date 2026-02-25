/**
 * Main Application Logic
 * Handles GPS location, form submission, and API communication
 */

const API_BASE_URL = window.location.origin + '/api';

let userLocation = null;
let deviceInfo = null;

// DOM Elements
const queueForm = document.getElementById('queueForm');
const generateSection = document.getElementById('generateSection');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const loadingSpinner = document.getElementById('loadingSpinner');
const locationInfo = document.getElementById('locationInfo');
const submitBtn = document.getElementById('submitBtn');
const verifyForm = document.getElementById('verifyForm');

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('NYSC Queue Management System Initialized');
  
  // Collect device fingerprint
  deviceInfo = DeviceFingerprint.getDeviceInfo();
  console.log('Device fingerprint collected');
  
  // Request GPS location
  requestLocation();
  
  // Load statistics
  loadStats();
  
  // Setup event listeners
  setupEventListeners();
});

// ============================================
// GPS LOCATION
// ============================================

/**
 * Request GPS location using a multi-sample strategy:
 * 1. First reading unblocks the UI so the user can proceed immediately.
 * 2. We keep watching for up to MAX_WATCH_MS and replace the stored location
 *    whenever a MORE ACCURATE reading arrives.
 * 3. If accuracy is already good (≤ GOOD_ACCURACY_M) we stop early.
 * This significantly reduces false "Outside LGA" rejections caused by an
 * initial coarse fix that improves once the device warms up its GPS.
 */
const GOOD_ACCURACY_M = 50;   // stop early when accuracy is this good or better
const MAX_WATCH_MS    = 15000; // keep refining for up to 15 seconds

function requestLocation() {
  if (!navigator.geolocation) {
    showLocationError('GPS is not supported by your browser');
    return;
  }

  locationInfo.innerHTML = '<p>📍 Acquiring GPS location…</p>';

  let watchId = null;
  let watchTimer = null;
  let gotFirstFix = false;

  const options = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  };

  function stopWatch() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (watchTimer !== null) {
      clearTimeout(watchTimer);
      watchTimer = null;
    }
  }

  function onPosition(position) {
    const { latitude, longitude, accuracy } = position.coords;

    // Accept this reading if it is the first or more accurate than what we have
    if (!gotFirstFix || accuracy < userLocation.accuracy) {
      userLocation = { latitude, longitude, accuracy };

      if (!gotFirstFix) {
        gotFirstFix = true;
        submitBtn.disabled = false;
      }

      const accuracyLabel = accuracy <= GOOD_ACCURACY_M
        ? `±${Math.round(accuracy)} m ✅`
        : `±${Math.round(accuracy)} m (refining…)`;

      locationInfo.className = 'success';
      locationInfo.innerHTML = `
        <p>📍 GPS Location Acquired</p>
        <small>Accuracy: ${accuracyLabel}</small>
      `;

      console.log('GPS fix updated:', userLocation);
    }

    // Stop early once accuracy is good enough
    if (accuracy <= GOOD_ACCURACY_M) {
      stopWatch();
      locationInfo.innerHTML = `
        <p>✅ GPS Location Ready</p>
        <small>Accuracy: ±${Math.round(accuracy)} m</small>
      `;
    }
  }

  function onError(error) {
    if (gotFirstFix) return; // already have a fix — ignore subsequent errors

    let message = 'Unable to get your location';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable GPS access.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable. Please try again outdoors.';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out. Please try again.';
        break;
    }
    stopWatch();
    showLocationError(message);
  }

  // Start watching — the first fix unblocks the form, subsequent fixes improve accuracy
  watchId = navigator.geolocation.watchPosition(onPosition, onError, options);

  // Auto-stop the watch after MAX_WATCH_MS regardless
  watchTimer = setTimeout(() => {
    stopWatch();
    if (gotFirstFix) {
      locationInfo.innerHTML = `
        <p>✅ GPS Location Ready</p>
        <small>Accuracy: ±${Math.round(userLocation.accuracy)} m</small>
      `;
    }
  }, MAX_WATCH_MS);
}

function onLocationError(error) {
  let message = 'Unable to get your location';
  switch (error.code) {
    case error.PERMISSION_DENIED:
      message = 'Location permission denied. Please enable GPS access.';
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'Location information unavailable.';
      break;
    case error.TIMEOUT:
      message = 'Location request timed out. Please try again.';
      break;
  }
  showLocationError(message);
}

function showLocationError(message) {
  locationInfo.innerHTML = `<p>❌ ${message}</p>`;
  locationInfo.classList.add('error');
  submitBtn.disabled = true;
}

// ============================================
// EVENT LISTENERS
// ============================================

// ============================================
// STATE CODE INPUT
// ============================================

/**
 * Normalize and validate a free-typed state code for submit.
 * Trims, uppercases, and checks format: XX/YYB/NNNN or XX/YYB/NNNNN
 * @param {string} raw - User-typed value (e.g. "ny/23a/1234")
 * @returns {string|null} - Normalized code (e.g. "NY/23A/1234") or null if invalid
 */
function normalizeStateCodeForSubmit(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase();
  const parts = normalized.split('/');
  if (parts.length !== 3) return null;
  const [state, yyb, number] = parts;
  if (!/^[A-Z]{2}$/.test(state) || !/^\d{2}[A-C]$/.test(yyb) || !/^\d{4,5}$/.test(number)) return null;
  return normalized;
}

function setupEventListeners() {
  // Only attach listeners when DOM is ready (called from DOMContentLoaded)
  if (!queueForm) return;

  // Queue generation form
  queueForm.addEventListener('submit', handleQueueGeneration);

  // Auto-uppercase state code as user types
  const stateCodeInput = document.getElementById('stateCode');
  if (stateCodeInput) {
    stateCodeInput.addEventListener('input', function () {
      const pos = this.selectionStart;
      this.value = this.value.toUpperCase();
      this.setSelectionRange(pos, pos);
    });
  }

  // Retry button
  document.getElementById('retryBtn')?.addEventListener('click', resetForm);
  
  // New queue button
  document.getElementById('newQueueBtn')?.addEventListener('click', resetForm);
  
  // Verification form
  verifyForm.addEventListener('submit', handleVerification);
  
  // Refresh stats button
  document.getElementById('refreshStatsBtn')?.addEventListener('click', loadStats);
}

// ============================================
// QUEUE GENERATION
// ============================================

async function handleQueueGeneration(e) {
  e.preventDefault();
  
  // Validate we have location
  if (!userLocation) {
    showError('GPS location is required. Please enable location access.');
    return;
  }

  const stateCodeRaw = document.getElementById('stateCode').value.trim().toUpperCase();
  
  // Normalize: allow 4 or 5 digits in number part (strip trailing underscores)
  const stateCode = normalizeStateCodeForSubmit(stateCodeRaw);
  if (!stateCode) {
    showError('Please complete your NYSC state code (4 or 5 digits in the number part)');
    return;
  }

  // Show loading
  queueForm.style.display = 'none';
  loadingSpinner.style.display = 'block';

  try {
    const response = await fetch(`${API_BASE_URL}/queue/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        state_code: stateCode,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        gps_accuracy: userLocation.accuracy,
        device_info: deviceInfo
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Success - show queue number
      showQueueResult(data, stateCode);
      loadStats(); // Refresh statistics
    } else {
      // Error from server - Enhanced error handling
      let errorMessage = data.error || data.message || 'Failed to generate queue number';
      
      // Show detailed info for device limit exceeded
      if (data.details && data.details.policy) {
        errorMessage += '\n\n📋 Details:\n';
        errorMessage += `• Your existing queue: #${String(data.details.existing_queue_number).padStart(3, '0')}\n`;
        errorMessage += `• State code used: ${data.details.existing_state_code}\n`;
        errorMessage += `• Attempted: ${data.details.attempted_state_code}\n\n`;
        errorMessage += `⚠️ ${data.details.policy}`;
      }
      
      throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('Queue generation error:', error);
    showError(error.message || 'Failed to generate queue number. Please try again.');
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

/**
 * Format queue result date/time for display.
 * Date: "Monday, 10 February 2026", Time: "5:08 PM"
 */
function formatQueueDateTime(isoDateString) {
  const d = new Date(isoDateString);
  // Always display in WAT (West Africa Time = UTC+1), regardless of device timezone
  const dateStr = d.toLocaleDateString('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeStr = d.toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  return { dateStr, timeStr };
}

function showQueueResult(data, stateCode) {
  // Hide other sections (only if elements exist)
  if (generateSection) generateSection.style.display = 'none';
  if (errorSection) errorSection.style.display = 'none';

  // Populate result data with null checks so updates only run when DOM is ready
  const queueNumberEl = document.getElementById('queueNumber');
  if (queueNumberEl) queueNumberEl.textContent = String(data.queue_number).padStart(3, '0');

  const lgaNameEl = document.getElementById('lgaName');
  if (lgaNameEl) lgaNameEl.textContent = data.lga || '-';

  const stateCodeDisplayEl = document.getElementById('stateCodeDisplay');
  if (stateCodeDisplayEl) stateCodeDisplayEl.textContent = stateCode || '-';

  const { dateStr, timeStr } = formatQueueDateTime(data.date || new Date().toISOString());
  const dateDisplayEl = document.getElementById('dateDisplay');
  if (dateDisplayEl) dateDisplayEl.textContent = dateStr;
  const timeDisplayEl = document.getElementById('timeDisplay');
  if (timeDisplayEl) timeDisplayEl.textContent = timeStr;

  const statusBadge = document.getElementById('statusDisplay');
  if (statusBadge) {
    statusBadge.textContent = data.status || '-';
    statusBadge.className = `value status-badge ${(data.status || '').toLowerCase()}`;
  }

  const referenceIdEl = document.getElementById('referenceId');
  if (referenceIdEl) referenceIdEl.textContent = data.reference_id || '-';

  // Show QR code if available
  if (data.qr_code) {
    const qrCodeImg = document.getElementById('qrCode');
    if (qrCodeImg) {
      qrCodeImg.src = data.qr_code;
      qrCodeImg.style.display = 'block';
    }
  }

  // Show result section
  if (resultSection) {
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// ============================================
// QUEUE VERIFICATION
// ============================================

async function handleVerification(e) {
  e.preventDefault();
  
  const referenceId = document.getElementById('referenceIdInput').value.trim();
  const verifyResult = document.getElementById('verifyResult');
  
  if (!referenceId) {
    verifyResult.innerHTML = '<p style="color: red;">Please enter a reference ID</p>';
    verifyResult.style.display = 'block';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/queue/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reference_id: referenceId,
        mark_used: false // Set to true to mark as used
      })
    });

    const data = await response.json();

    if (response.ok && data.valid) {
      verifyResult.className = 'success';
      verifyResult.innerHTML = `
        <h4>✅ Valid Queue Number</h4>
        <p><strong>Queue Number:</strong> ${data.queue_number}</p>
        <p><strong>State Code:</strong> ${data.state_code}</p>
        <p><strong>LGA:</strong> ${data.lga}</p>
        <p><strong>Status:</strong> ${data.status}</p>
        <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
      `;
    } else {
      verifyResult.className = 'error';
      verifyResult.innerHTML = `
        <h4>❌ Invalid Queue Number</h4>
        <p>${data.error || 'This queue number could not be verified'}</p>
      `;
    }
    
    verifyResult.style.display = 'block';

  } catch (error) {
    console.error('Verification error:', error);
    verifyResult.className = 'error';
    verifyResult.innerHTML = '<p>Verification failed. Please try again.</p>';
    verifyResult.style.display = 'block';
  }
}

// ============================================
// STATISTICS
// ============================================

async function loadStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/queue/stats`);
    const data = await response.json();

    if (data.stats) {
      document.getElementById('totalQueued').textContent = data.stats.total_queued || 0;
      document.getElementById('activeCount').textContent = data.stats.active || 0;
      document.getElementById('usedCount').textContent = data.stats.used || 0;
    }
  } catch (error) {
    console.error('Failed to load statistics:', error);
  }
}

// ============================================
// ERROR HANDLING
// ============================================

function showError(message) {
  generateSection.style.display = 'none';
  resultSection.style.display = 'none';
  errorSection.style.display = 'block';
  
  document.getElementById('errorMessage').textContent = message;
  
  errorSection.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  // Show generate section
  generateSection.style.display = 'block';
  resultSection.style.display = 'none';
  errorSection.style.display = 'none';
  
  // Reset form
  queueForm.reset();
  queueForm.style.display = 'block';
  
  // Clear state code input
  const stateCodeEl = document.getElementById('stateCode');
  if (stateCodeEl) stateCodeEl.value = '';
  
  // Request new location
  requestLocation();
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Prevent form submission on Enter in verification input
document.getElementById('referenceIdInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleVerification(e);
  }
});

console.log('App initialized successfully');
