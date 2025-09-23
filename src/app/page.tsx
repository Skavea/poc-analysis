/**
 * Page 1: Stocks List
 * ===================
 * 
 * Lists all stocks that have been fetched and stored
 * User can add new stocks or click on existing ones
 */

'use client';

import { useState, useEffect } from 'react';
import { DatabaseService, StockData } from '@/lib/database';
import { Plus, BarChart3, Calendar, Database } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Client-side only component to avoid hydration issues
const ClientOnlyInput = dynamic(() => Promise.resolve(({ value, onChange, placeholder, disabled }: any) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
)), { ssr: false });

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getStockDatasets();
      setStocks(data);
    } catch (error) {
      console.error('Error loading stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNewStock = async () => {
    if (!newSymbol.trim()) return;
    
    setIsAdding(true);
    try {
      const response = await fetch('/api/process-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol: newSymbol }),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadStocks();
        setNewSymbol('');
        alert(`Successfully added ${newSymbol}! Created ${result.segmentsCreated} segments.`);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Error adding stock. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDateRange = (data: any) => {
    if (!data || typeof data !== 'object') return 'Unknown';
    
    const timestamps = Object.keys(data).sort();
    if (timestamps.length === 0) return 'No data';
    
    const firstDate = new Date(timestamps[0]).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    const lastDate = new Date(timestamps[timestamps.length - 1]).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    return `${firstDate} - ${lastDate}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Stock Analysis System
              </h1>
              <p className="mt-2 text-gray-600">
                Manage stock datasets and analysis
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add New Stock */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Add New Stock
          </h2>
          <div className="flex space-x-4">
            <ClientOnlyInput
              value={newSymbol}
              onChange={(e: any) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Enter stock symbol (e.g., AAPL)"
              disabled={false}
            />
            <button
              onClick={addNewStock}
              disabled={isAdding || !newSymbol.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              <span>{isAdding ? 'Adding...' : 'Add Stock'}</span>
            </button>
          </div>
        </div>

        {/* Stocks List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              Available Stocks
            </h2>
            <span className="text-sm text-gray-500">
              {stocks.length} stocks available
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No stocks found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add your first stock to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stocks.map((stock) => (
                <Link
                  key={stock.id}
                  href={`/analysis/${stock.symbol}`}
                  className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                      <span className="text-xl font-semibold text-gray-900">
                        {stock.symbol}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(stock.created_at)}
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
                        Data Points: {stock.total_points.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-blue-600 font-medium">
                      Click to view analysis →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}