/**
 * Database Schema Check
 * ====================
 * 
 * Script to check if the database schema matches the expected structure
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

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...');
    
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('\n📋 Tables in database:');
    tables.forEach((table: any) => {
      console.log(`- ${table.table_name}`);
    });
    
    // Check stock_data table columns
    if (tables.some((t: any) => t.table_name === 'stock_data')) {
      const stockDataColumns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'stock_data'
        ORDER BY ordinal_position
      `;
      
      console.log('\n📊 stock_data table columns:');
      stockDataColumns.forEach((col: any) => {
        console.log(`- ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    // Check analysis_results table columns
    if (tables.some((t: any) => t.table_name === 'analysis_results')) {
      const analysisResultsColumns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'analysis_results'
        ORDER BY ordinal_position
      `;
      
      console.log('\n📈 analysis_results table columns:');
      analysisResultsColumns.forEach((col: any) => {
        console.log(`- ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    // Check for any sample data
    if (tables.some((t: any) => t.table_name === 'stock_data')) {
      const stockDataCount = await sql`SELECT COUNT(*) as count FROM stock_data`;
      console.log(`\n📝 stock_data table has ${stockDataCount[0].count} records`);
    }
    
    if (tables.some((t: any) => t.table_name === 'analysis_results')) {
      const analysisResultsCount = await sql`SELECT COUNT(*) as count FROM analysis_results`;
      console.log(`📝 analysis_results table has ${analysisResultsCount[0].count} records`);
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkSchema();
