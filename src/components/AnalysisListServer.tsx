/**
 * Server Component: Analysis List
 * ===============================
 * 
 * Server-side component that fetches and displays analysis results for a stock
 */

import { DatabaseService } from '@/lib/db';
import { AnalysisResult } from '@/lib/schema';
import { TrendingUp, TrendingDown, Clock, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface AnalysisListServerProps {
  symbol: string;
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function AnalysisListServer({ symbol, searchParams }: AnalysisListServerProps) {
  let results: AnalysisResult[] = [];
  let error: string | null = null;

  try {
    results = await DatabaseService.getAnalysisResults(symbol);
  } catch (err) {
    console.error('Error loading analysis results:', err);
    error = 'Failed to load analysis results';
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSchemaTypeColor = (schemaType: string) => {
    switch (schemaType) {
      case 'R':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'V':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UNCLASSIFIED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'UP' ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <BarChart3 className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error Loading Analysis
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No analysis results found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Run analysis to generate segments for this stock.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <div
          key={result.id}
          className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200"
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {getTrendIcon(result.trendDirection)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-gray-900">
                        Segment {result.id.split('_').pop()?.split(' ')[0] || 'Unknown'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSchemaTypeColor(result.schemaType)}`}>
                        {result.schemaType}
                      </span>
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(result.segmentStart.toISOString())} - {formatTime(result.segmentEnd.toISOString())}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="h-4 w-4" />
                        <span>{result.pointCount} points</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        x0: ${Number(result.x0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Avg: ${Number(result.averagePrice).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        Min: ${Number(result.minPrice).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Max: ${Number(result.maxPrice).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        Trend: <span className={`font-medium ${result.trendDirection === 'UP' ? 'text-green-600' : 'text-red-600'}`}>
                          {result.trendDirection}
                        </span>
                      </span>
                    </div>
                    
                    <Link
                      href={`/segment/${encodeURIComponent(result.id)}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
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
