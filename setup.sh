#!/bin/bash

echo "🚀 Setting up Stock Analysis Visualizer..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found. Please create it with your DATABASE_URL and ALPHA_VANTAGE_API_KEY"
    echo "Example:"
    echo "DATABASE_URL=postgresql://username:password@host/database?sslmode=require"
    echo "ALPHA_VANTAGE_API_KEY=your_api_key_here"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if database tables exist
echo "🔍 Checking database connection..."
node -e "
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function checkTables() {
  try {
    const result = await sql\`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'\`;
    const tables = result.map(r => r.table_name);
    
    if (tables.includes('stock_data') && tables.includes('analysis_results')) {
      console.log('✅ Database tables exist');
    } else {
      console.log('❌ Database tables missing. Please run the SQL schema first.');
      console.log('Tables found:', tables);
    }
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
}

checkTables();
"

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure your database tables are created (run database-schema.sql)"
echo "2. Add your ALPHA_VANTAGE_API_KEY to .env.local"
echo "3. Run: npm run dev"
echo "4. Open: http://localhost:3000"