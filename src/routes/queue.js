const express = require('express');
const router = express.Router();
const pool = require('../database/config');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const { validateStateCode, validateLocation } = require('../utils/validation');
const { isWithinGeofence, validateCoordinates } = require('../utils/geofencing');
const { generateFingerprint, generateStableFingerprint, validateDeviceInfo } = require('../utils/fingerprint');
const { queueGenerationLimiter, verificationLimiter } = require('../middleware/rateLimiter');
const { logSecurityEvent } = require('../middleware/security');

/**
 * POST /api/queue/generate
 * Generate a new queue number for a corps member
 * 
 * Security checks:
 * 1. Validate state code format
 * 2. Validate GPS coordinates
 * 3. Check geofence (user must be within LGA radius)
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

    // VALIDATION 2: GPS Coordinates Format
    const locationValidation = validateLocation(latitude, longitude);
    if (!locationValidation.valid) {
      logSecurityEvent(req, 'QUEUE_GENERATION', `FAILED - ${locationValidation.message}`);
      return res.status(400).json({
        error: locationValidation.message
      });
    }
    const userLat = locationValidation.latitude;
    const userLon = locationValidation.longitude;

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

    // Generate device fingerprints (full + stable for cross-browser detection)
    const deviceFingerprint = generateFingerprint(device_info);
    const deviceStableFingerprint = generateStableFingerprint(device_info);
    const clientIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress || '';

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
    
    // Check if user is within geofence
    const geofenceCheck = isWithinGeofence(
      userLat,
      userLon,
      parseFloat(lga.latitude),
      parseFloat(lga.longitude),
      lga.radius_meters
    );

    if (!geofenceCheck.isWithin) {
      await client.query('ROLLBACK');
      logSecurityEvent(req, 'QUEUE_GENERATION', `FAILED - Outside geofence (${geofenceCheck.distance}m away)`);
      return res.status(403).json({
        error: 'You are outside the allowed LGA area',
        details: {
          lga: lga.name,
          your_distance: `${geofenceCheck.distance} meters away`,
          allowed_radius: `${geofenceCheck.allowed} meters`,
          message: 'You must be physically present at the LGA to generate a queue number'
        }
      });
    }

    // VALIDATION 4b: ONE DEVICE PER DAY - Prevent same phone from generating multiple queues
    // Check if this device (fingerprint, stable fingerprint, or IP) already has a queue today
    const today = new Date().toISOString().split('T')[0];
    
    const deviceAlreadyUsed = await client.query(`
      SELECT * FROM queue_entries 
      WHERE date = $1 AND lga_id = $2
      AND (
        device_fingerprint = $3 
        OR (device_stable_fingerprint IS NOT NULL AND device_stable_fingerprint = $4)
        OR (client_ip IS NOT NULL AND client_ip = $5)
      )
      LIMIT 1
    `, [today, lga.id, deviceFingerprint, deviceStableFingerprint, clientIp || '']);

    if (deviceAlreadyUsed.rows.length > 0) {
      const existing = deviceAlreadyUsed.rows[0];
      await client.query('ROLLBACK');
      logSecurityEvent(req, 'QUEUE_GENERATION', 'FAILED - Device already used today');
      return res.status(403).json({
        error: 'This device has already generated a queue number today',
        message: 'Each phone can only generate one queue number per day, regardless of browser or state code.',
        existing_queue: {
          queue_number: existing.queue_number,
          state_code: existing.state_code,
          lga: lga.name,
          status: existing.status,
          date: existing.date
        }
      });
    }

    // VALIDATION 5: Check for existing queue entry today (same state code)
    const existingEntry = await client.query(`
      SELECT * FROM queue_entries 
      WHERE state_code = $1 
      AND date = $2 
      AND lga_id = $3
    `, [normalizedStateCode, today, lga.id]);

    if (existingEntry.rows.length > 0) {
      const existing = existingEntry.rows[0];
      
      // VALIDATION 6: Device fingerprint check for returning user
      if (existing.device_fingerprint !== deviceFingerprint) {
        await client.query('ROLLBACK');
        logSecurityEvent(req, 'QUEUE_GENERATION', 'FAILED - Device mismatch');
        return res.status(401).json({
          error: 'Device mismatch detected',
          message: 'This state code has already been used from a different device today'
        });
      }

      // Same device, return existing queue number
      await client.query('COMMIT');
      logSecurityEvent(req, 'QUEUE_GENERATION', 'SUCCESS - Returned existing queue');
      
      return res.status(200).json({
        message: 'You already have a queue number for today',
        queue_number: existing.queue_number,
        lga: lga.name,
        reference_id: existing.id,
        status: existing.status,
        date: existing.date
      });
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

    // Create queue entry (include device_stable_fingerprint and client_ip for device-per-day limit)
    const insertResult = await client.query(`
      INSERT INTO queue_entries (
        state_code,
        queue_number,
        lga_id,
        device_fingerprint,
        device_stable_fingerprint,
        client_ip,
        latitude,
        longitude,
        status,
        date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      normalizedStateCode,
      nextQueueNumber,
      lga.id,
      deviceFingerprint,
      deviceStableFingerprint,
      clientIp || null,
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
