/**
 * Admin Panel JavaScript
 * Handles PIN authentication, queue verification, and statistics
 */

const API_BASE_URL = window.location.origin + '/api';
const ADMIN_PIN = '2324';

// ============================================
// PIN AUTHENTICATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  checkAuthentication();
  setupEventListeners();
});

function checkAuthentication() {
  const isAuthenticated = sessionStorage.getItem('adminAuthenticated');
  
  if (isAuthenticated === 'true') {
    showAdminPanel();
  } else {
    showPinOverlay();
  }
}

function showPinOverlay() {
  document.getElementById('pinOverlay').style.display = 'flex';
  document.getElementById('adminContent').style.display = 'none';
}

function showAdminPanel() {
  document.getElementById('pinOverlay').style.display = 'none';
  document.getElementById('adminContent').style.display = 'block';
  loadStats();
  loadAdminOverrideCount();
}

async function loadAdminOverrideCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/queue/stats`);
    const data = await response.json();
    if (data.stats && data.stats.admin_generated !== undefined) {
      const countEl = document.getElementById('adminOverrideCount');
      if (countEl) countEl.textContent = data.stats.admin_generated;
    }
  } catch (_) {
    // silently ignore — non-critical UI element
  }
}

function setupEventListeners() {
  // PIN form submission
  const pinForm = document.getElementById('pinForm');
  if (pinForm) {
    pinForm.addEventListener('submit', handlePinSubmission);
  }

  // Manual generation form
  const manualForm = document.getElementById('manualGenerateForm');
  if (manualForm) {
    manualForm.addEventListener('submit', handleManualGenerate);
  }

  // Verification form
  const verifyForm = document.getElementById('verifyForm');
  if (verifyForm) {
    verifyForm.addEventListener('submit', handleVerification);
  }
  
  // Refresh stats button
  const refreshBtn = document.getElementById('refreshStatsBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadStats);
  }
  
  // Logout functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

function handlePinSubmission(e) {
  e.preventDefault();
  
  const pinInput = document.getElementById('pinInput');
  const pinError = document.getElementById('pinError');
  const enteredPin = pinInput.value.trim();
  
  // Simple client-side validation (in production, validate against backend)
  if (enteredPin === ADMIN_PIN) {
    sessionStorage.setItem('adminAuthenticated', 'true');
    showAdminPanel();
    pinInput.value = '';
    pinError.style.display = 'none';
  } else {
    pinError.textContent = '❌ Invalid PIN. Please try again.';
    pinError.style.display = 'block';
    pinInput.value = '';
    pinInput.focus();
  }
}

function handleLogout() {
  sessionStorage.removeItem('adminAuthenticated');
  window.location.href = '/';
}

// ============================================
// MANUAL QUEUE GENERATION (ADMIN OVERRIDE)
// ============================================

async function handleManualGenerate(e) {
  e.preventDefault();

  const stateCode    = document.getElementById('manualStateCode').value.trim();
  const reason       = document.getElementById('manualReason').value;
  const resultBox    = document.getElementById('manualGenerateResult');
  const btn          = document.getElementById('manualGenerateBtn');

  if (!stateCode || !reason) {
    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="padding:15px;background:#f8d7da;border:2px solid #dc3545;border-radius:8px;color:#721c24;">⚠️ Please fill in both the state code and reason.</div>';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Generating…';
  resultBox.style.display = 'block';
  resultBox.innerHTML = '<div style="padding:15px;background:#e2e3e5;border-radius:8px;color:#383d41;">⏳ Generating queue number…</div>';

  try {
    const response = await fetch(`${API_BASE_URL}/queue/admin-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_pin: ADMIN_PIN,
        state_code: stateCode,
        reason
      })
    });

    const data = await response.json();

    if (response.ok) {
      const isExisting = response.status === 200;
      const queueNum   = String(data.queue_number).padStart(3, '0');

      resultBox.innerHTML = `
        <div style="padding:20px;background:#d4edda;border:2px solid #28a745;border-radius:8px;">
          <h4 style="color:#155724;margin-bottom:15px;">
            ${isExisting ? '📋 Existing Queue Number Returned' : '✅ Queue Number Generated'}
          </h4>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;color:#555;font-weight:600;width:45%;">Queue Number</td><td style="padding:8px;font-size:1.4rem;font-weight:700;color:#155724;">#${queueNum}</td></tr>
            <tr><td style="padding:8px;color:#555;font-weight:600;">State Code</td><td style="padding:8px;">${stateCode.toUpperCase()}</td></tr>
            <tr><td style="padding:8px;color:#555;font-weight:600;">LGA</td><td style="padding:8px;">${data.lga}</td></tr>
            <tr><td style="padding:8px;color:#555;font-weight:600;">Status</td><td style="padding:8px;">${data.status}</td></tr>
            <tr><td style="padding:8px;color:#555;font-weight:600;">Source</td><td style="padding:8px;">🔧 Admin Override</td></tr>
            <tr><td style="padding:8px;color:#555;font-weight:600;">Reason</td><td style="padding:8px;">${data.reason || reason}</td></tr>
            <tr><td style="padding:8px;color:#555;font-weight:600;">Reference ID</td><td style="padding:8px;font-size:0.8rem;word-break:break-all;">${data.reference_id}</td></tr>
          </table>
          ${data.admin_generated_today !== undefined
            ? `<p style="margin-top:12px;font-size:0.85rem;color:#155724;">📋 Admin overrides used today: <strong>${data.admin_generated_today} / 50</strong></p>`
            : ''}
        </div>
      `;

      // Update override count display
      if (data.admin_generated_today !== undefined) {
        const countEl = document.getElementById('adminOverrideCount');
        if (countEl) countEl.textContent = data.admin_generated_today;
      }

      // Reset form on success
      document.getElementById('manualGenerateForm').reset();
      loadStats();

    } else {
      resultBox.innerHTML = `
        <div style="padding:20px;background:#f8d7da;border:2px solid #dc3545;border-radius:8px;">
          <h4 style="color:#721c24;margin-bottom:10px;">❌ Failed to Generate</h4>
          <p style="color:#721c24;">${data.error || 'An error occurred. Please try again.'}</p>
        </div>
      `;
    }

  } catch (err) {
    console.error('Manual generate error:', err);
    resultBox.innerHTML = `
      <div style="padding:20px;background:#f8d7da;border:2px solid #dc3545;border-radius:8px;">
        <h4 style="color:#721c24;">❌ Connection Error</h4>
        <p style="color:#721c24;">Unable to reach server. Please try again.</p>
      </div>
    `;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Number for Corps Member';
  }
}

// ============================================
// QUEUE VERIFICATION
// ============================================

async function handleVerification(e) {
  e.preventDefault();
  
  const referenceId = document.getElementById('referenceIdInput').value.trim();
  const markUsed = document.getElementById('markUsedCheckbox').checked;
  const verifyResult = document.getElementById('verifyResult');
  
  if (!referenceId) {
    verifyResult.innerHTML = '<p style="color: red;">Please enter a reference ID</p>';
    verifyResult.style.display = 'block';
    return;
  }

  // Show loading state
  verifyResult.innerHTML = '<p>Verifying...</p>';
  verifyResult.style.display = 'block';

  try {
    const response = await fetch(`${API_BASE_URL}/queue/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reference_id: referenceId,
        mark_used: markUsed
      })
    });

    const data = await response.json();

    if (response.ok && data.valid) {
      verifyResult.className = 'success';
      verifyResult.innerHTML = `
        <div style="padding: 20px; background: #d4edda; border: 2px solid #28a745; border-radius: 8px;">
          <h4 style="color: #155724; margin-bottom: 15px;">✅ Valid Queue Number</h4>
          <div style="text-align: left;">
            <p><strong>Queue Number:</strong> ${String(data.queue_number).padStart(3, '0')}</p>
            <p><strong>State Code:</strong> ${data.state_code}</p>
            <p><strong>LGA:</strong> ${data.lga}</p>
            <p><strong>Status:</strong> <span style="color: ${data.status === 'ACTIVE' ? '#28a745' : '#dc3545'};">${data.status}</span></p>
            <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
            <p><strong>Reference ID:</strong> ${data.reference_id}</p>
          </div>
          ${markUsed ? '<p style="margin-top: 15px; color: #155724; font-weight: 600;">✓ Queue marked as USED</p>' : ''}
        </div>
      `;
      
      // Refresh stats if marked as used
      if (markUsed) {
        setTimeout(() => loadStats(), 500);
      }
    } else {
      verifyResult.className = 'error';
      verifyResult.innerHTML = `
        <div style="padding: 20px; background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px;">
          <h4 style="color: #721c24; margin-bottom: 10px;">❌ Invalid Queue Number</h4>
          <p style="color: #721c24;">${data.error || 'This queue number could not be verified'}</p>
        </div>
      `;
    }
    
    verifyResult.style.display = 'block';

  } catch (error) {
    console.error('Verification error:', error);
    verifyResult.className = 'error';
    verifyResult.innerHTML = `
      <div style="padding: 20px; background: #f8d7da; border: 2px solid #dc3545; border-radius: 8px;">
        <h4 style="color: #721c24;">❌ Verification Failed</h4>
        <p style="color: #721c24;">Unable to connect to server. Please try again.</p>
      </div>
    `;
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
      
      // Update last refresh time
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      const refreshInfo = document.querySelector('.card p');
      if (refreshInfo && refreshInfo.textContent.includes('Last updated')) {
        refreshInfo.textContent = `📊 Daily Statistics - Last updated: ${timeString}`;
      }
    }
  } catch (error) {
    console.error('Failed to load statistics:', error);
    // Don't show error to user, just log it
  }
}

// Auto-refresh stats every 30 seconds
setInterval(() => {
  if (sessionStorage.getItem('adminAuthenticated') === 'true') {
    loadStats();
  }
}, 30000);

console.log('Admin panel initialized');
