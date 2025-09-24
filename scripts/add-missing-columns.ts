/**
 * Add Missing Columns Migration
 * ============================
 * 
 * Script to add missing columns to the analysis_results table
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = dotenv.parse(envContent);
  
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing columns to analysis_results table...');
    
    // Check if columns exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'analysis_results' AND table_schema = 'public'
    `;
    
    const columnNames = columns.map((col: any) => col.column_name);
    
    // Add original_point_count if missing
    if (!columnNames.includes('original_point_count')) {
      console.log('Adding original_point_count column...');
      await sql`ALTER TABLE analysis_results ADD COLUMN original_point_count INTEGER`;
      
      // Set default value for existing records
      console.log('Setting default value for original_point_count...');
      await sql`UPDATE analysis_results SET original_point_count = point_count`;
    } else {
      console.log('original_point_count column already exists');
    }
    
    // Add points_in_region if missing
    if (!columnNames.includes('points_in_region')) {
      console.log('Adding points_in_region column...');
      await sql`ALTER TABLE analysis_results ADD COLUMN points_in_region INTEGER`;
      
      // Set default value for existing records
      // For UP trend: assume 60% of points are above average
      // For DOWN trend: assume 60% of points are below average
      console.log('Setting default value for points_in_region...');
      await sql`
        UPDATE analysis_results 
        SET points_in_region = 
          CASE 
            WHEN trend_direction = 'UP' THEN CEIL(point_count * 0.6)::INTEGER
            ELSE CEIL(point_count * 0.6)::INTEGER
          END
      `;
    } else {
      console.log('points_in_region column already exists');
    }
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Error adding missing columns:', error);
  }
}

addMissingColumns();
