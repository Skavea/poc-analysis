# Stock Visualizer Setup Guide

## 🚀 Quick Start

### 1. Set up Neon SQL Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy your database URL
4. Create the tables using the schema from `../database-schema.sql`

### 2. Configure Environment

Create a `.env.local` file in the root directory:

```bash
# Neon SQL Database URL
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Database Setup

Run the SQL schema from `../database-schema.sql` in your Neon database:

```sql
-- Copy and paste the contents of database-schema.sql
-- into your Neon SQL editor
```

## 🔧 Features

- **Real-time Data**: Fetches analysis results from Neon database
- **Interactive Charts**: Visualize segment data with Recharts
- **Filtering**: Filter by symbol and date
- **Statistics**: View trend analysis statistics
- **Responsive Design**: Works on desktop and mobile

## 📁 Project Structure

```
src/
├── app/
│   └── page.tsx              # Main dashboard page
├── components/
│   ├── SegmentCard.tsx       # Individual segment display
│   ├── SegmentChart.tsx      # Chart visualization
│   ├── StatsCard.tsx         # Statistics cards
│   └── FilterBar.tsx         # Filter controls
└── lib/
    └── database.ts           # Database connection and queries
```

## 🎯 Next Steps

1. Set up your Neon database
2. Run the stock analysis system to populate data
3. View the results in the web interface
4. Analyze the quality of the segment extraction and trend analysis

