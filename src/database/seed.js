const pool = require('./config');
require('dotenv').config();

/**
 * Database Seeding Script
 * Populates database with initial LGA data for testing
 */
async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seeding...');
    
    // Get LGA configuration from environment variables
    const lgaName = process.env.DEFAULT_LGA_NAME || 'Ikeja';
    const lgaLat = parseFloat(process.env.DEFAULT_LGA_LAT || '6.6018');
    const lgaLng = parseFloat(process.env.DEFAULT_LGA_LNG || '3.3515');
    const lgaRadius = parseInt(process.env.DEFAULT_LGA_RADIUS || '500');

    // Insert default LGA (Ikeja, Lagos)
    const result = await client.query(`
      INSERT INTO lgas (name, latitude, longitude, radius_meters)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name) DO UPDATE 
      SET 
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        radius_meters = EXCLUDED.radius_meters
      RETURNING *;
    `, [lgaName, lgaLat, lgaLng, lgaRadius]);

    console.log('✓ Seeded LGA:', result.rows[0]);
    console.log('\n✅ Database seeded successfully!');
    console.log(`\nTest LGA Details:`);
    console.log(`Name: ${lgaName}`);
    console.log(`Location: ${lgaLat}, ${lgaLng}`);
    console.log(`Radius: ${lgaRadius} meters`);
    console.log(`\nYou must be within ${lgaRadius} meters of this location to generate a queue number.`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seeding
seedDatabase().catch(console.error);
