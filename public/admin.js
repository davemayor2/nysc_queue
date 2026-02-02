/**
 * Admin Panel JavaScript
 * PIN-protected admin functionality for queue verification and management
 */

const API_BASE_URL = window.location.origin + '/api';

// Admin PIN (In production, this should be validated server-side)
const ADMIN_PIN = '1234'; // Change this to your preferred PIN

// Check if already authenticated
let isAuthenticated = sessionStorage.getItem('adminAuth') === 'true';

// ============================================
// AUTHENTICATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated) {
    showAdminPanel();
  } else {
    showPINOverlay();
  }
  
  // Allow Enter key to submit PIN
  document.getElementById('pinInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      verifyPIN();
    }
  });
});

function showPINOverlay() {
  document.getElementById('pinOverlay').style.display = 'flex';
  document.getElementById('adminContent').style.display = 'none';
  document.getElementById('pinInput').focus();
}

function showAdminPanel() {
  document.getElementById('pinOverlay').style.display = 'none';
  document.getElementById('adminContent').style.display = 'block';
  
  // Load initial data
  loadStats();
  setupEventListeners();
}

function verifyPIN() {
  const enteredPIN = document.getElementById('pinInput').value;
  const pinError = document.getElementById('pinError');
  
  if (enteredPIN === ADMIN_PIN) {
    // PIN correct
    sessionStorage.setItem('adminAuth', 'true');
    isAuthenticated = true;
    pinError.style.display = 'none';
    showAdminPanel();
  } else {
    // PIN incorrect
    pinError.style.display = 'block';
    document.getElementById('pinInput').value = '';
    document.getElementById('pinInput').focus();
    
    // Shake animation
    const dialog = document.querySelector('.pin-dialog');
    dialog.style.animation = 'shake 0.5s';
    setTimeout(() => {
      dialog.style.animation = '';
    }, 500);
  }
}

function logout() {
  sessionStorage.removeItem('adminAuth');
  isAuthenticated = false;
  document.getElementById('pinInput').value = '';
  showPINOverlay();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Verification form
  document.getElementById('verifyForm').addEventListener('submit', handleVerification);
  
  // Refresh stats button
  document.getElementById('refreshStatsBtn').addEventListener('click', loadStats);
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
      document.getElementById('lgaName').textContent = data.stats.lga_name || 'N/A';
    }
  } catch (error) {
    console.error('Failed to load statistics:', error);
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
    showVerifyError('Please enter a reference ID');
    return;
  }

  // Show loading
  verifyResult.style.display = 'block';
  verifyResult.className = '';
  verifyResult.innerHTML = '<p style="text-align: center;">🔄 Verifying...</p>';

  try {
    const response = await fetch(`${API_BASE_URL}/queue/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reference_id: referenceId,
        mark_used: false // Don't mark as used automatically
      })
    });

    const data = await response.json();

    if (response.ok && data.valid) {
      showVerifySuccess(data, referenceId);
    } else {
      showVerifyError(data.error || 'Invalid queue number');
    }

  } catch (error) {
    console.error('Verification error:', error);
    showVerifyError('Verification failed. Please try again.');
  }
}

function showVerifySuccess(data, referenceId) {
  const verifyResult = document.getElementById('verifyResult');
  verifyResult.className = 'success';
  
  const statusClass = data.status === 'ACTIVE' ? 'active' : 'used';
  const statusText = data.status === 'ACTIVE' ? '✅ Active' : '🔴 Already Used';
  
  verifyResult.innerHTML = `
    <h3 style="color: #28a745; margin-bottom: 15px;">✅ Valid Queue Number</h3>
    
    <table class="queue-details-table">
      <tr>
        <td>Queue Number:</td>
        <td><strong style="font-size: 1.5rem; color: #2c5f2d;">${String(data.queue_number).padStart(3, '0')}</strong></td>
      </tr>
      <tr>
        <td>State Code:</td>
        <td><strong>${data.state_code}</strong></td>
      </tr>
      <tr>
        <td>LGA:</td>
        <td>${data.lga}</td>
      </tr>
      <tr>
        <td>Status:</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      </tr>
      <tr>
        <td>Date:</td>
        <td>${new Date(data.date).toLocaleDateString()}</td>
      </tr>
      <tr>
        <td>Created:</td>
        <td>${new Date(data.created_at).toLocaleString()}</td>
      </tr>
    </table>
    
    ${data.status === 'ACTIVE' ? `
      <div class="action-buttons">
        <button onclick="markAsUsed('${referenceId}')" class="btn btn-danger" style="flex: 1;">
          Mark as USED
        </button>
        <button onclick="document.getElementById('referenceIdInput').value = ''; document.getElementById('verifyResult').style.display = 'none';" 
                class="btn btn-secondary" style="flex: 1;">
          Clear
        </button>
      </div>
    ` : `
      <p style="text-align: center; margin-top: 15px; color: #856404; background: #fff3cd; padding: 10px; border-radius: 5px;">
        ⚠️ This queue number has already been used
      </p>
      <button onclick="document.getElementById('referenceIdInput').value = ''; document.getElementById('verifyResult').style.display = 'none';" 
              class="btn btn-secondary" style="width: 100%; margin-top: 10px;">
        Clear
      </button>
    `}
  `;
}

function showVerifyError(message) {
  const verifyResult = document.getElementById('verifyResult');
  verifyResult.className = 'error';
  verifyResult.innerHTML = `
    <h3 style="color: #dc3545; margin-bottom: 15px;">❌ Verification Failed</h3>
    <p style="background: #f8d7da; padding: 15px; border-radius: 5px; color: #721c24;">
      ${message}
    </p>
    <button onclick="document.getElementById('referenceIdInput').value = ''; document.getElementById('verifyResult').style.display = 'none';" 
            class="btn btn-secondary" style="width: 100%; margin-top: 15px;">
      Try Again
    </button>
  `;
}

// ============================================
// MARK AS USED
// ============================================

async function markAsUsed(referenceId) {
  if (!confirm('Are you sure you want to mark this queue number as USED?\n\nThis action cannot be undone.')) {
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
        mark_used: true
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert('✅ Queue number marked as USED successfully!');
      
      // Clear form and refresh stats
      document.getElementById('referenceIdInput').value = '';
      document.getElementById('verifyResult').style.display = 'none';
      loadStats();
    } else {
      alert('❌ Failed to mark as used: ' + (data.error || 'Unknown error'));
    }

  } catch (error) {
    console.error('Mark as used error:', error);
    alert('❌ Failed to mark as used. Please try again.');
  }
}

// Add shake animation to CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }
`;
document.head.appendChild(style);
