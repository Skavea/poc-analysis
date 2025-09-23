/**
 * Page 1: Stocks List
 * ===================
 * 
 * Lists all stocks that have been fetched and stored
 * User can add new stocks or click on existing ones
 */

import { DatabaseService } from '@/lib/db';
import { StockData } from '@/lib/schema';
import { BarChart3, Calendar, Database } from 'lucide-react';
import Link from 'next/link';
import AddStockForm from '@/components/AddStockForm';

// Server component for stock list
async function StockListServer() {
  const stocks = await DatabaseService.getAllStockData();

  return (
    <div className="space-y-6">
      {stocks.length === 0 ? (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No stocks found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a new stock dataset.
          </p>
        </div>
      ) : (
        stocks.map((stock) => (
          <div
            key={stock.id}
            className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-semibold text-gray-900">
                          {stock.symbol}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(stock.createdAt.toISOString())}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Date Range: {getDateRange(stock.data)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Database className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Data Points: {stock.totalPoints.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-3">
                          <Link
                            href={`/analysis/${stock.symbol}`}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Analysis
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}


// Utility functions
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getDateRange(data: any) {
  if (!data || typeof data !== 'object') return 'N/A';
  
  const timestamps = Object.keys(data).filter(key => 
    key.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  );
  
  if (timestamps.length === 0) return 'N/A';
  
  const sorted = timestamps.sort();
  const start = sorted[0].split(' ')[0];
  const end = sorted[sorted.length - 1].split(' ')[0];
  
  return start === end ? start : `${start} - ${end}`;
}

// Main page component
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stock Analysis System</h1>
              <p className="mt-2 text-gray-600">Manage stock datasets and analysis</p>
            </div>
            <div className="flex items-center space-x-4">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add New Stock Form */}
        <AddStockForm />

        {/* Stocks List */}
        <StockListServer />
      </div>
    </div>
  );
}