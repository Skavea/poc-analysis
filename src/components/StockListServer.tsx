/**
 * Server Component: Stock List
 * ===========================
 * 
 * Server-side component that fetches and displays stock data
 */

import { DatabaseService } from '@/lib/db';
import { StockData } from '@/lib/schema';
import { Plus, BarChart3, Calendar, Database } from 'lucide-react';
import Link from 'next/link';

interface StockListServerProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function StockListServer({ searchParams }: StockListServerProps) {
  let stocks: StockData[] = [];
  let error: string | null = null;

  try {
    stocks = await DatabaseService.getAllStockData();
  } catch (err) {
    console.error('Error loading stocks:', err);
    error = 'Failed to load stock data';
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDateRange = (data: any) => {
    if (!data || typeof data !== 'object') return 'N/A';
    
    const timestamps = Object.keys(data).filter(key => 
      key.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    );
    
    if (timestamps.length === 0) return 'N/A';
    
    const sorted = timestamps.sort();
    const start = sorted[0].split(' ')[0];
    const end = sorted[sorted.length - 1].split(' ')[0];
    
    return start === end ? start : `${start} - ${end}`;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Database className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error Loading Data
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="text-center py-12">
        <Database className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No stocks found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by adding a new stock dataset.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stocks.map((stock) => (
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
      ))}
    </div>
  );
}
