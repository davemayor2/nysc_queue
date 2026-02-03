const pool = require('./config');

/**
 * Migration: Add device-per-day limit columns
 * Prevents one phone from generating multiple queue numbers (different state codes)
 */
async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running device limit migration...');
    
    // Add device_stable_fingerprint - identifies device across different browsers
    await client.query(`
      ALTER TABLE queue_entries 
      ADD COLUMN IF NOT EXISTS device_stable_fingerprint VARCHAR(255);
    `);
    console.log('✓ device_stable_fingerprint column added');
    
    // Add client_ip - IP-based fallback for same device identification
    await client.query(`
      ALTER TABLE queue_entries 
      ADD COLUMN IF NOT EXISTS client_ip VARCHAR(45);
    `);
    console.log('✓ client_ip column added');
    
    // Create index for fast device lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_queue_entries_device_stable 
      ON queue_entries(device_stable_fingerprint);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_queue_entries_client_ip 
      ON queue_entries(client_ip);
    `);
    console.log('✓ Indexes created');
    
    console.log('\n✅ Device limit migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
