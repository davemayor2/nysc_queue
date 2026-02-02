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

function setupEventListeners() {
  // Queue generation form
  queueForm.addEventListener('submit', handleQueueGeneration);
  
  // Retry button
  document.getElementById('retryBtn')?.addEventListener('click', resetForm);
  
  // New queue button
  document.getElementById('newQueueBtn')?.addEventListener('click', resetForm);
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

  const stateCode = document.getElementById('stateCode').value.trim().toUpperCase();
  
  if (!stateCode) {
    showError('Please enter your NYSC state code');
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
    } else {
      // Error from server
      throw new Error(data.error || data.message || 'Failed to generate queue number');
    }

  } catch (error) {
    console.error('Queue generation error:', error);
    showError(error.message || 'Failed to generate queue number. Please try again.');
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

function showQueueResult(data, stateCode) {
  // Hide other sections
  generateSection.style.display = 'none';
  errorSection.style.display = 'none';
  
  // Populate result data
  document.getElementById('queueNumber').textContent = 
    String(data.queue_number).padStart(3, '0');
  document.getElementById('stateCodeDisplay').textContent = stateCode;
  document.getElementById('lgaName').textContent = data.lga;
  
  // Format and display generation timestamp
  const generatedOn = formatDateTime(new Date());
  document.getElementById('generatedOnDisplay').textContent = generatedOn;
  
  const statusBadge = document.getElementById('statusDisplay');
  statusBadge.textContent = data.status;
  statusBadge.className = `value status-badge ${data.status.toLowerCase()}`;

  // Show QR code if available
  if (data.qr_code) {
    const qrCodeImg = document.getElementById('qrCode');
    qrCodeImg.src = data.qr_code;
    qrCodeImg.style.display = 'block';
  }

  // Show result section
  resultSection.style.display = 'block';
  
  // Scroll to result
  resultSection.scrollIntoView({ behavior: 'smooth' });
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
  
  // Request new location
  requestLocation();
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format date and time in human-readable format
 * Example: "Monday, 12 August 2026 at 9:14 AM"
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date and time string
 */
function formatDateTime(date) {
  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  const formatted = date.toLocaleString('en-US', options);
  // Format: "Monday, August 12, 2026 at 9:14 AM"
  // We want: "Monday, 12 August 2026 at 9:14 AM"
  
  // Get individual components
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  return `${weekday}, ${day} ${month} ${year} at ${time}`;
}

// Auto-format state code input
document.getElementById('stateCode')?.addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
});

console.log('App initialized successfully');
