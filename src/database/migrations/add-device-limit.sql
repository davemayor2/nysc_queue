-- Migration: Add device-per-day limit columns
-- Run this in Neon SQL Editor or: psql $DATABASE_URL -f src/database/migrations/add-device-limit.sql

-- Add device_stable_fingerprint - identifies device across different browsers
ALTER TABLE queue_entries 
ADD COLUMN IF NOT EXISTS device_stable_fingerprint VARCHAR(255);

-- Add client_ip - IP-based fallback for same device identification  
ALTER TABLE queue_entries 
ADD COLUMN IF NOT EXISTS client_ip VARCHAR(45);

-- Create indexes for fast device lookups
CREATE INDEX IF NOT EXISTS idx_queue_entries_device_stable 
ON queue_entries(device_stable_fingerprint);

CREATE INDEX IF NOT EXISTS idx_queue_entries_client_ip 
ON queue_entries(client_ip);
