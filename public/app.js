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

function requestLocation() {
  if (!navigator.geolocation) {
    showLocationError('GPS is not supported by your browser');
    return;
  }

  locationInfo.innerHTML = '<p>📍 Requesting GPS location...</p>';
  
  const options = {
    enableHighAccuracy: true, // Request high accuracy
    timeout: 10000, // 10 second timeout
    maximumAge: 0 // Don't use cached position
  };

  navigator.geolocation.getCurrentPosition(
    onLocationSuccess,
    onLocationError,
    options
  );
}

function onLocationSuccess(position) {
  userLocation = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy
  };

  console.log('GPS Location:', userLocation);

  locationInfo.innerHTML = `
    <p>✅ GPS Location Acquired</p>
    <small>Accuracy: ±${Math.round(userLocation.accuracy)} meters</small>
  `;
  locationInfo.classList.add('success');
  
  submitBtn.disabled = false;
}

function onLocationError(error) {
  let message = 'Unable to get your location';
  
  switch(error.code) {
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
// STATE CODE INPUT MASK
// ============================================

// Mask: 2 letters / 3 (YYB) / 4 or 5 digits
const STATE_CODE_MASK = '__/___/_____';

/**
 * Initialize state code input with mask
 */
function initializeStateCodeMask() {
  const input = document.getElementById('stateCode');
  if (input) {
    // Set initial cursor position
    setTimeout(() => {
      input.setSelectionRange(0, 0);
    }, 0);
  }
}

/**
 * Handles typing in the masked state code field
 */
function handleStateCodeKeydown(e) {
  const input = e.target;
  const key = e.key;
  let cursorPos = input.selectionStart;
  let value = input.value;
  
  // Allow special keys
  if (['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(key)) {
    return;
  }
  
  // Handle backspace
  if (key === 'Backspace') {
    e.preventDefault();
    
    // Find previous editable position
    let deletePos = cursorPos - 1;
    while (deletePos >= 0 && value[deletePos] === '/') {
      deletePos--;
    }
    
    if (deletePos >= 0) {
      const newValue = value.substring(0, deletePos) + '_' + value.substring(deletePos + 1);
      input.value = newValue;
      input.setSelectionRange(deletePos, deletePos);
    }
    return;
  }
  
  // Handle delete key
  if (key === 'Delete') {
    e.preventDefault();
    
    let deletePos = cursorPos;
    while (deletePos < value.length && value[deletePos] === '/') {
      deletePos++;
    }
    
    if (deletePos < value.length) {
      const newValue = value.substring(0, deletePos) + '_' + value.substring(deletePos + 1);
      input.value = newValue;
      input.setSelectionRange(cursorPos, cursorPos);
    }
    return;
  }
  
  // Handle arrow keys
  if (key === 'ArrowRight') {
    e.preventDefault();
    let nextPos = cursorPos + 1;
    while (nextPos < value.length && value[nextPos] === '/') {
      nextPos++;
    }
    input.setSelectionRange(nextPos, nextPos);
    return;
  }
  
  if (key === 'ArrowLeft') {
    e.preventDefault();
    let prevPos = cursorPos - 1;
    while (prevPos >= 0 && value[prevPos] === '/') {
      prevPos--;
    }
    if (prevPos >= 0) {
      input.setSelectionRange(prevPos, prevPos);
    }
    return;
  }
  
  if (key === 'Home') {
    e.preventDefault();
    input.setSelectionRange(0, 0);
    return;
  }
  
  if (key === 'End') {
    e.preventDefault();
    input.setSelectionRange(value.length, value.length);
    return;
  }
  
  // Handle regular character input
  if (key.length === 1) {
    e.preventDefault();
    
    // Skip over slashes to find next input position
    let insertPos = cursorPos;
    while (insertPos < value.length && value[insertPos] === '/') {
      insertPos++;
    }
    
    if (insertPos >= value.length) return;
    
    const char = key.toUpperCase();
    
    // Validate character based on position
    let isValid = false;
    if (insertPos < 2 && /[A-Z]/.test(char)) {
      // First 2: letters (state code)
      isValid = true;
    } else if ((insertPos >= 3 && insertPos <= 4) && /[0-9]/.test(char)) {
      // Positions 3-4: digits (year)
      isValid = true;
    } else if (insertPos === 5 && /[A-C]/.test(char)) {
      // Position 5: letter A-C (batch)
      isValid = true;
    } else if (insertPos >= 7 && insertPos <= 11 && /[0-9]/.test(char)) {
      // Positions 7-11: digits (number, 4 or 5 digits)
      isValid = true;
    }
    
    if (isValid) {
      // Insert character
      const newValue = value.substring(0, insertPos) + char + value.substring(insertPos + 1);
      input.value = newValue;
      
      // Move cursor to next position (skip slashes)
      let nextPos = insertPos + 1;
      while (nextPos < newValue.length && newValue[nextPos] === '/') {
        nextPos++;
      }
      input.setSelectionRange(nextPos, nextPos);
    }
  }
}

/**
 * Normalize state code for submit: allow 4 or 5 digits in number part.
 * Strips underscores from each part; returns null if invalid.
 * @param {string} raw - Raw masked value (e.g. NY/23A/1234_ or NY/23A/12345)
 * @returns {string|null} - Normalized code (e.g. NY/23A/1234) or null
 */
function normalizeStateCodeForSubmit(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.trim().toUpperCase().split('/');
  if (parts.length !== 3) return null;
  const state = parts[0].replace(/_/g, '');
  const yyb = parts[1].replace(/_/g, '');
  const number = parts[2].replace(/_/g, '');
  if (state.length !== 2 || yyb.length !== 3) return null;
  if (number.length < 4 || number.length > 5) return null;
  if (!/^[A-Z]{2}$/.test(state) || !/^\d{2}[A-C]$/.test(yyb) || !/^\d+$/.test(number)) return null;
  return state + '/' + yyb + '/' + number;
}

function setupEventListeners() {
  // Only attach listeners when DOM is ready (called from DOMContentLoaded)
  if (!queueForm) return;

  // Queue generation form
  queueForm.addEventListener('submit', handleQueueGeneration);

  // State code input mask
  const stateCodeInput = document.getElementById('stateCode');
  if (stateCodeInput) {
    initializeStateCodeMask();
    stateCodeInput.addEventListener('keydown', handleStateCodeKeydown);
    stateCodeInput.addEventListener('click', function() {
    const pos = this.selectionStart;
    if (this.value[pos] === '/') {
      this.setSelectionRange(pos + 1, pos + 1);
    }
  });
  
  // Handle paste in masked input
  stateCodeInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Insert pasted text character by character
    let value = stateCodeInput.value;
    let pos = 0;
    
    for (let i = 0; i < pastedText.length && pos < value.length; i++) {
      while (pos < value.length && value[pos] === '/') {
        pos++;
      }
      if (pos < value.length) {
        value = value.substring(0, pos) + pastedText[i] + value.substring(pos + 1);
        pos++;
      }
    }
    
    stateCodeInput.value = value;
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
  const dateStr = d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeStr = d.toLocaleTimeString('en-GB', {
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
  
  // Reset state code mask
  document.getElementById('stateCode').value = STATE_CODE_MASK;
  
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
