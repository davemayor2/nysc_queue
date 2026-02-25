const express = require('express');
const router = express.Router();
const pool = require('../database/config');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const { validateStateCode, validateLocation } = require('../utils/validation');
const { isWithinGeofence, validateCoordinates } = require('../utils/geofencing');
const { generateFingerprint, validateDeviceInfo } = require('../utils/fingerprint');
const { queueGenerationLimiter, verificationLimiter } = require('../middleware/rateLimiter');
const { logSecurityEvent } = require('../middleware/security');

/** Only skip geofencing when explicitly set to 'true' (local dev). Unset or 'false' = production. */
const isDevMode = process.env.DEV_MODE === 'true';

/**
 * POST /api/queue/generate
 * Generate a new queue number for a corps member
 *
 * Security checks (geofencing skipped when DEV_MODE=true):
 * 1. Validate state code format
 * 2. Validate GPS coordinates (skipped in DEV_MODE; uses LGA center if missing)
 * 3. Check geofence - user must be within LGA radius (skipped in DEV_MODE)
 * 4. Generate device fingerprint
 * 5. Check for duplicate entries (one per day per state code)
 * 6. Verify device matches if returning user
 */
router.post('/generate', queueGenerationLimiter, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      state_code,
      latitude,
      longitude,
      gps_accuracy,
      device_info
    } = req.body;

    // VALIDATION 1: State Code Format
    const stateCodeValidation = validateStateCode(state_code);
    if (!stateCodeValidation.valid) {
      logSecurityEvent(req, 'QUEUE_GENERATION', `FAILED - ${stateCodeValidation.message}`);
      return res.status(400).json({
        error: stateCodeValidation.message
      });
    }
    const normalizedStateCode = stateCodeValidation.normalized;

    // VALIDATION 2: GPS Coordinates (skipped in DEV_MODE; enforced in production)
    let userLat, userLon;
    if (!isDevMode) {
      const locationValidation = validateLocation(latitude, longitude);
      if (!locationValidation.valid) {
        logSecurityEvent(req, 'QUEUE_GENERATION', `FAILED - ${locationValidation.message}`);
        return res.status(400).json({
          error: locationValidation.message
        });
      }
      userLat = locationValidation.latitude;
      userLon = locationValidation.longitude;
    }

    // VALIDATION 3: Device Info
    if (!device_info) {
      return res.status(400).json({
        error: 'Device information is required'
      });
    }

    const deviceInfoValidation = validateDeviceInfo(device_info);
    if (!deviceInfoValidation.valid) {
      return res.status(400).json({
        error: 'Incomplete device information',
        missing: deviceInfoValidation.missing
      });
    }

    // Generate device fingerprint
    const deviceFingerprint = generateFingerprint(device_info);

    await client.query('BEGIN');

    // VALIDATION 4: Find nearest LGA and check geofence
    const lgaResult = await client.query('SELECT * FROM lgas LIMIT 1');
    
    if (lgaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(503).json({
        error: 'No LGA configured. Please contact administrator'
      });
    }

    const lga = lgaResult.rows[0];

    // In DEV_MODE: use LGA center if coords were not validated earlier; skip geofence
    if (isDevMode) {
      const loc = validateLocation(latitude, longitude);
      if (loc.valid) {
        userLat = loc.latitude;
        userLon = loc.longitude;
      } else {
        userLat = parseFloat(lga.latitude);
        userLon = parseFloat(lga.longitude);
      }
    }

    // Check if user is within geofence (skipped when DEV_MODE=true)
    if (!isDevMode) {
      const accuracyMeters = typeof gps_accuracy === 'number' && gps_accuracy > 0 ? gps_accuracy : 0;

      const geofenceCheck = isWithinGeofence(
        userLat,
        userLon,
        parseFloat(lga.latitude),
        parseFloat(lga.longitude),
        lga.radius_meters,
        accuracyMeters
      );

      if (!geofenceCheck.isWithin) {
        await client.query('ROLLBACK');
        logSecurityEvent(req, 'QUEUE_GENERATION', `FAILED - Outside geofence (${geofenceCheck.distance}m away, effective ${geofenceCheck.effectiveDistance}m after ±${geofenceCheck.accuracyAdjust}m GPS adjust)`);
        return res.status(403).json({
          error: 'You are outside the allowed LGA area',
          details: {
            lga: lga.name,
            your_distance: `${geofenceCheck.distance} meters away`,
            effective_distance: `${geofenceCheck.effectiveDistance} meters (after GPS accuracy adjustment)`,
            gps_accuracy: `±${geofenceCheck.accuracyAdjust} meters`,
            allowed_radius: `${geofenceCheck.allowed} meters`,
            message: 'You must be physically present at the LGA to generate a queue number'
          }
        });
      }
    }

    // VALIDATION 5: Check if this DEVICE has already generated a queue today
    // ONE QUEUE PER DEVICE PER DAY - regardless of state code
    const today = new Date().toISOString().split('T')[0];
    const deviceCheckResult = await client.query(`
      SELECT * FROM queue_entries 
      WHERE device_fingerprint = $1 
      AND date = $2 
      AND lga_id = $3
    `, [deviceFingerprint, today, lga.id]);

    if (deviceCheckResult.rows.length > 0) {
      const existing = deviceCheckResult.rows[0];
      await client.query('ROLLBACK');
      
      // Check if they're using the same state code
      if (existing.state_code === normalizedStateCode) {
        // Same device, same state code - return existing queue
        logSecurityEvent(req, 'QUEUE_GENERATION', 'SUCCESS - Returned existing queue');
        return res.status(200).json({
          message: 'You already have a queue number for today',
          queue_number: existing.queue_number,
          lga: lga.name,
          reference_id: existing.id,
          status: existing.status,
          date: existing.date
        });
      } else {
        // Same device, different state code - DENY
        logSecurityEvent(req, 'QUEUE_GENERATION', `FAILED - Device already used (existing: ${existing.state_code}, attempted: ${normalizedStateCode})`);
        return res.status(403).json({
          error: 'One queue per device limit exceeded',
          message: 'This device has already generated a queue number today',
          details: {
            existing_queue_number: existing.queue_number,
            existing_state_code: existing.state_code,
            attempted_state_code: normalizedStateCode,
            policy: 'Only one queue number per device per day is allowed'
          }
        });
      }
    }

    // VALIDATION 6: Check if this STATE CODE was already used (from different device)
    const stateCodeCheckResult = await client.query(`
      SELECT * FROM queue_entries 
      WHERE state_code = $1 
      AND date = $2 
      AND lga_id = $3
    `, [normalizedStateCode, today, lga.id]);

    if (stateCodeCheckResult.rows.length > 0) {
      const existing = stateCodeCheckResult.rows[0];
      
      // State code exists but from different device - DENY
      if (existing.device_fingerprint !== deviceFingerprint) {
        await client.query('ROLLBACK');
        logSecurityEvent(req, 'QUEUE_GENERATION', 'FAILED - State code already used from different device');
        return res.status(401).json({
          error: 'State code already used',
          message: 'This state code has already been used from a different device today'
        });
      }
    }

    // GENERATE NEW QUEUE NUMBER
    // Get the next queue number for this LGA today
    const queueNumberResult = await client.query(`
      SELECT COALESCE(MAX(queue_number), 0) + 1 as next_number
      FROM queue_entries
      WHERE lga_id = $1 AND date = $2
    `, [lga.id, today]);

    const nextQueueNumber = queueNumberResult.rows[0].next_number;

    // Insert corps member if not exists
    await client.query(`
      INSERT INTO corps_members (state_code)
      VALUES ($1)
      ON CONFLICT (state_code) DO NOTHING
    `, [normalizedStateCode]);

    // Create queue entry
    const insertResult = await client.query(`
      INSERT INTO queue_entries (
        state_code,
        queue_number,
        lga_id,
        device_fingerprint,
        latitude,
        longitude,
        status,
        date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      normalizedStateCode,
      nextQueueNumber,
      lga.id,
      deviceFingerprint,
      userLat,
      userLon,
      'ACTIVE',
      today
    ]);

    await client.query('COMMIT');

    const queueEntry = insertResult.rows[0];
    
    logSecurityEvent(req, 'QUEUE_GENERATION', `SUCCESS - Queue #${nextQueueNumber}`);

    // Generate QR code
    const qrCodeData = JSON.stringify({
      ref: queueEntry.id,
      queue: nextQueueNumber,
      lga: lga.name,
      date: today
    });
    
    const qrCode = await QRCode.toDataURL(qrCodeData);

    res.status(201).json({
      success: true,
      message: 'Queue number generated successfully',
      queue_number: nextQueueNumber,
      lga: lga.name,
      reference_id: queueEntry.id,
      status: queueEntry.status,
      date: queueEntry.date,
      qr_code: qrCode,
      instructions: 'Please save this queue number. You will need it for verification.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Queue generation error:', error);
    logSecurityEvent(req, 'QUEUE_GENERATION', `ERROR - ${error.message}`);
    
    res.status(500).json({
      error: 'Failed to generate queue number',
      message: 'Please try again later'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/queue/verify
 * Verify and optionally mark a queue number as used
 */
router.post('/verify', verificationLimiter, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { reference_id, mark_used } = req.body;

    if (!reference_id) {
      return res.status(400).json({
        error: 'Reference ID is required'
      });
    }

    await client.query('BEGIN');

    // Find queue entry
    const result = await client.query(`
      SELECT qe.*, l.name as lga_name
      FROM queue_entries qe
      JOIN lgas l ON qe.lga_id = l.id
      WHERE qe.id = $1
    `, [reference_id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      logSecurityEvent(req, 'QUEUE_VERIFICATION', 'FAILED - Invalid reference ID');
      return res.status(404).json({
        error: 'Invalid reference ID',
        valid: false
      });
    }

    const queueEntry = result.rows[0];

    // Check if entry is for today
    const today = new Date().toISOString().split('T')[0];
    const entryDate = new Date(queueEntry.date).toISOString().split('T')[0];
    
    if (entryDate !== today) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Queue number expired',
        valid: false,
        message: 'This queue number was for a different day'
      });
    }

    // Mark as used if requested
    if (mark_used === true && queueEntry.status === 'ACTIVE') {
      await client.query(`
        UPDATE queue_entries
        SET status = 'USED'
        WHERE id = $1
      `, [reference_id]);
      
      queueEntry.status = 'USED';
      logSecurityEvent(req, 'QUEUE_VERIFICATION', `SUCCESS - Marked as USED`);
    }

    await client.query('COMMIT');

    logSecurityEvent(req, 'QUEUE_VERIFICATION', 'SUCCESS');

    res.json({
      valid: true,
      queue_number: queueEntry.queue_number,
      state_code: queueEntry.state_code,
      lga: queueEntry.lga_name,
      status: queueEntry.status,
      date: queueEntry.date,
      created_at: queueEntry.created_at
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Queue verification error:', error);
    logSecurityEvent(req, 'QUEUE_VERIFICATION', `ERROR - ${error.message}`);
    
    res.status(500).json({
      error: 'Verification failed',
      valid: false
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/queue/stats
 * Get current queue statistics for today
 */
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(`
      SELECT 
        l.name as lga_name,
        COUNT(*) as total_queued,
        COUNT(*) FILTER (WHERE qe.status = 'ACTIVE') as active,
        COUNT(*) FILTER (WHERE qe.status = 'USED') as used,
        MAX(qe.queue_number) as highest_number
      FROM queue_entries qe
      JOIN lgas l ON qe.lga_id = l.id
      WHERE qe.date = $1
      GROUP BY l.name
    `, [today]);

    res.json({
      date: today,
      stats: result.rows.length > 0 ? result.rows[0] : {
        lga_name: 'N/A',
        total_queued: 0,
        active: 0,
        used: 0,
        highest_number: 0
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;
