const pool = require('./config');

/**
 * Database Migration Script
 * Creates all necessary tables with proper constraints for data integrity
 */
async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migrations...');
    
    await client.query('BEGIN');

    // Create LGA table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lgas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        radius_meters INTEGER NOT NULL DEFAULT 500,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ LGA table created');

    // Create Corps Members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS corps_members (
        state_code VARCHAR(20) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Corps Members table created');

    // Create Queue Entries table with comprehensive constraints
    await client.query(`
      CREATE TABLE IF NOT EXISTS queue_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        state_code VARCHAR(20) NOT NULL,
        queue_number INTEGER NOT NULL,
        lga_id UUID NOT NULL REFERENCES lgas(id) ON DELETE CASCADE,
        device_fingerprint VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED')),
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Ensure one queue number per state code per day per LGA
        UNIQUE(state_code, date, lga_id),
        
        -- Ensure queue numbers are unique per LGA per day
        UNIQUE(queue_number, lga_id, date)
      );
    `);
    console.log('✓ Queue Entries table created');

    // Create indexes for performance optimization
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_queue_entries_state_code 
      ON queue_entries(state_code);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_queue_entries_date 
      ON queue_entries(date);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_queue_entries_lga_date 
      ON queue_entries(lga_id, date);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_queue_entries_status 
      ON queue_entries(status);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_queue_entries_device_fingerprint 
      ON queue_entries(device_fingerprint);
    `);
    console.log('✓ Indexes created');

    // Create function to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for automatic timestamp updates
    await client.query(`
      DROP TRIGGER IF EXISTS update_lgas_updated_at ON lgas;
      CREATE TRIGGER update_lgas_updated_at 
      BEFORE UPDATE ON lgas 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_queue_entries_updated_at ON queue_entries;
      CREATE TRIGGER update_queue_entries_updated_at 
      BEFORE UPDATE ON queue_entries 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✓ Triggers created');

    await client.query('COMMIT');
    console.log('\n✅ All migrations completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations().catch(console.error);
