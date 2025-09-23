# Stock Analysis Visualizer

A complete 3-page flow for stock data analysis with Neon SQL database integration.

## 🎯 **Complete Flow**

### **Page 1: Stocks List**
- Lists all stocks that have been fetched and stored
- Shows date range and data points for each stock
- Add new stocks by entering symbol
- Click on any stock to go to analysis page

### **Page 2: Analysis Page**
- Lists all sub-datasets for a specific stock
- Shows trend analysis (UP/DOWN) for each segment
- Filter by enhanced/not enhanced status
- Run analysis to create new segments
- Click on any segment to view details

### **Page 3: Segment Detail**
- Left: Interactive price chart (TradingView style)
- Right: Analysis data and enhancement options
- Choose R or V schema type
- Save enhancement to mark segment as enhanced

## 🚀 **Quick Start**

### **1. Set up Neon Database**
1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy your database URL
4. Run the SQL schema in the SQL editor:

```sql
-- Copy and paste the contents of database-schema.sql
```

### **2. Configure Environment**
Create `.env.local`:
```env
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
ALPHA_VANTAGE_API_KEY=your_api_key_here
```

### **3. Install and Run**
```bash
# Install dependencies
npm install

# Run setup script
./setup.sh

# Start development server
npm run dev
```

### **4. Open the App**
Visit: http://localhost:3000

## 📊 **Features**

### **Stock Data Management**
- ✅ Fetch from Alpha Vantage API (1-minute intervals)
- ✅ Store raw data in Neon SQL database
- ✅ Cache data to avoid repeated API calls
- ✅ Support for multiple stocks

### **Analysis Engine**
- ✅ Extract 2-hour segments from trading days
- ✅ x0 analysis (last point vs average)
- ✅ UP/DOWN trend detection
- ✅ 6-21 points per segment (adjustable)
- ✅ Never cross trading days

### **Visualization**
- ✅ Interactive price charts
- ✅ Real-time data display
- ✅ Trend indicators
- ✅ Responsive design

### **Enhancement System**
- ✅ R/V schema selection
- ✅ Enhanced/not enhanced status
- ✅ Database persistence
- ✅ Reset functionality

## 🏗️ **Architecture**

### **Database Schema**
- `stock_data`: Raw API data (JSONB)
- `analysis_results`: Analysis results with enhancement status

### **API Routes**
- `POST /api/process-stock`: Add new stock and run analysis
- `POST /api/run-analysis`: Run analysis on existing stock data

### **External Services**
- `StockAnalysisService`: Handles API calls and analysis
- `DatabaseService`: Database operations

## 🔧 **API Integration**

### **Alpha Vantage API**
- 1-minute intervals for maximum granularity
- Full historical data (19,110+ points)
- Rate limiting handled automatically

### **Neon SQL Database**
- Serverless PostgreSQL
- JSONB for flexible data storage
- Automatic connection pooling

## 📱 **Pages**

### **1. Stocks List (`/`)**
- Grid view of all stocks
- Add new stock functionality
- Data statistics display

### **2. Analysis Page (`/analysis/[symbol]`)**
- Segments list with filters
- Run analysis button
- Enhanced/not enhanced status

### **3. Segment Detail (`/segment/[id]`)**
- Interactive chart visualization
- Analysis data display
- Enhancement controls

## 🎨 **UI Components**

- **Responsive Design**: Works on all devices
- **Modern UI**: Clean, professional interface
- **Interactive Charts**: Recharts integration
- **Real-time Updates**: Live data refresh
- **Status Indicators**: Visual trend indicators

## 🔑 **Environment Variables**

```env
# Required
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
ALPHA_VANTAGE_API_KEY=your_api_key_here

# Optional
NODE_ENV=development
```

## 📈 **Usage Examples**

### **Add New Stock**
1. Go to main page
2. Enter stock symbol (e.g., AAPL)
3. Click "Add Stock"
4. Wait for analysis to complete
5. View results in analysis page

### **Run Analysis**
1. Go to analysis page for a stock
2. Click "Run Analysis"
3. Wait for segments to be created
4. View new segments in the list

### **Enhance Segment**
1. Click on any segment
2. Choose R or V schema
3. Click "Save Enhancement"
4. Segment is now marked as enhanced

## 🚨 **Troubleshooting**

### **Database Connection Issues**
- Check DATABASE_URL format
- Ensure database tables are created
- Verify Neon database is active

### **API Issues**
- Check ALPHA_VANTAGE_API_KEY
- Verify API key has sufficient quota
- Check network connectivity

### **Analysis Issues**
- Ensure stock data exists
- Check segment extraction logic
- Verify database permissions

## 📝 **Development**

### **File Structure**
```
src/
├── app/
│   ├── page.tsx                 # Page 1: Stocks list
│   ├── analysis/[symbol]/       # Page 2: Analysis page
│   ├── segment/[id]/            # Page 3: Segment detail
│   └── api/                     # API routes
├── lib/
│   ├── database.ts              # Database service
│   └── stockAnalysisService.ts  # Analysis service
└── components/                  # Reusable components
```

### **Key Functions**
- `DatabaseService.getStockDatasets()`: Get all stocks
- `DatabaseService.getAnalysisResults()`: Get segments
- `StockAnalysisService.processStock()`: Add new stock
- `StockAnalysisService.extractSegments()`: Run analysis

## 🎉 **Ready to Use!**

The complete 3-page flow is now ready:
1. **Stocks List** → Add stocks, view data
2. **Analysis Page** → Run analysis, view segments  
3. **Segment Detail** → Visualize data, enhance segments

All external services are integrated and the database schema is optimized for your requirements!