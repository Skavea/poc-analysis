/**
 * Page 2: Analysis Page
 * =====================
 * 
 * Lists all sub-datasets for a specific stock
 * Shows trend analysis (UP/DOWN) for each segment
 * Filter by R/V/UNCLASSIFIED schema types
 * Run analysis to create new segments
 * Click on any segment to view details
 */

import { use } from 'react';
import { DatabaseService } from '@/lib/db';
import { AnalysisResult } from '@/lib/schema';
import { TrendingUp, TrendingDown, Clock, BarChart3, Play, Filter } from 'lucide-react';
import Link from 'next/link';
import RunAnalysisButton from '@/components/RunAnalysisButton';
import AnalysisFilter from '@/components/AnalysisFilter';

interface AnalysisPageProps {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ filter?: string }>;
}

// Server component for analysis results with stats
async function AnalysisStatsServer({ 
  symbol, 
  searchParams 
}: { 
  symbol: string;
  searchParams: { filter?: string };
}) {
  const results = await DatabaseService.getAnalysisResults(symbol);
  
  const rCount = results.filter(r => r.schemaType === 'R').length;
  const vCount = results.filter(r => r.schemaType === 'V').length;
  const unclassifiedCount = results.filter(r => r.schemaType === 'UNCLASSIFIED').length;
  const hasExistingAnalysis = results.length > 0;

  // Filter results based on search params
  const filter = searchParams.filter || 'all';
  const filteredResults = filter === 'all' 
    ? results 
    : results.filter(result => result.schemaType === filter);

  return (
    <div className="space-y-6">
      {/* Analysis Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {hasExistingAnalysis ? 'Analysis Status' : 'Create New Analysis'}
            </h2>
            <p className="text-sm text-gray-600">
              {hasExistingAnalysis 
                ? `Analysis already exists for ${symbol}. View existing segments below.`
                : `Generate sub-datasets and trend analysis for ${symbol}`
              }
            </p>
          </div>
          {!hasExistingAnalysis && (
            <RunAnalysisButton symbol={symbol} />
          )}
          {hasExistingAnalysis && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
              <BarChart3 className="h-4 w-4" />
              <span>Analysis Complete</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Analysis Results
          </h2>
          <AnalysisFilter 
            totalCount={results.length}
            rCount={rCount}
            vCount={vCount}
            unclassifiedCount={unclassifiedCount}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {results.length}
            </div>
            <div className="text-sm text-blue-600">Total Segments</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {rCount}
            </div>
            <div className="text-sm text-red-600">R Schema</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {vCount}
            </div>
            <div className="text-sm text-purple-600">V Schema</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {unclassifiedCount}
            </div>
            <div className="text-sm text-gray-600">Unclassified</div>
          </div>
        </div>
      </div>

      {/* Results List */}
      {filteredResults.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {results.length === 0 ? 'No analysis results found' : 'No segments match the current filter'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {results.length === 0 ? 'Run analysis to generate sub-datasets.' : 'Try changing the filter to see more results.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredResults.map((result) => (
            <Link
              key={result.id}
              href={`/segment/${encodeURIComponent(result.id)}`}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {result.trendDirection === 'UP' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {result.trendDirection}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {result.schemaType === 'R' && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                      R
                    </span>
                  )}
                  {result.schemaType === 'V' && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                      V
                    </span>
                  )}
                  {result.schemaType === 'UNCLASSIFIED' && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      Unclassified
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {formatTime(result.segmentStart.toISOString())} - {formatTime(result.segmentEnd.toISOString())}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600">
                  <div>Date: {formatDate(result.date)}</div>
                  <div>Points: {result.pointCount}</div>
                  <div>x0: ${Number(result.x0).toFixed(2)}</div>
                  <div>Avg: ${Number(result.averagePrice).toFixed(2)}</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-blue-600 font-medium">
                  Click to view details →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


// Utility functions
function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getSchemaTypeColor(schemaType: string) {
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
}

function getTrendIcon(trend: string) {
  return trend === 'UP' ? (
    <TrendingUp className="h-4 w-4 text-green-500" />
  ) : (
    <TrendingDown className="h-4 w-4 text-red-500" />
  );
}

// Main page component
export default function AnalysisPage({ params, searchParams }: AnalysisPageProps) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const symbol = resolvedParams.symbol;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Analysis: {symbol}
              </h1>
              <p className="mt-2 text-gray-600">
                Sub-datasets and trend analysis
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalysisStatsServer symbol={symbol} searchParams={resolvedSearchParams} />
      </div>
    </div>
  );
}