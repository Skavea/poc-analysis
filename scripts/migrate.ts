/**
 * Database Migration Script
 * ========================
 * 
 * Run database migrations using DrizzleORM
 */

import { migrate } from 'drizzle-orm/neon-http/migrator';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function runMigrations() {
  try {
    console.log('Starting database migration...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const connection = neon(process.env.DATABASE_URL);
    const db = drizzle(connection);

    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
