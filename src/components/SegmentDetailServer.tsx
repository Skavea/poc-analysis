/**
 * Server Component: Segment Detail
 * ================================
 * 
 * Server-side component that fetches and displays segment analysis data
 */

import { DatabaseService } from '@/lib/db';
import { AnalysisResult } from '@/lib/schema';
import { TrendingUp, TrendingDown, Clock, BarChart3 } from 'lucide-react';

interface SegmentDetailServerProps {
  segmentId: string;
}

export default async function SegmentDetailServer({ segmentId }: SegmentDetailServerProps) {
  let segmentData: {
    analysis: AnalysisResult;
    chartData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
  } | null = null;
  let error: string | null = null;

  try {
    segmentData = await DatabaseService.getSegmentData(segmentId);
    if (!segmentData) {
      error = 'Segment not found';
    }
  } catch (err) {
    console.error('Error loading segment data:', err);
    error = 'Failed to load segment data';
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
      <TrendingUp className="h-5 w-5 text-green-500" />
    ) : (
      <TrendingDown className="h-5 w-5 text-red-500" />
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
              Error Loading Segment
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!segmentData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Segment not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The requested segment could not be found.
        </p>
      </div>
    );
  }

  const { analysis, chartData } = segmentData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                {getTrendIcon(analysis.trendDirection)}
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {analysis.symbol} Segment Analysis
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-500">
                  {formatDate(analysis.segmentStart.toISOString())} {formatTime(analysis.segmentStart.toISOString())} - {formatTime(analysis.segmentEnd.toISOString())}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSchemaTypeColor(analysis.schemaType)}`}>
                  {analysis.schemaType}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Data Points</p>
              <p className="text-2xl font-semibold text-gray-900">{analysis.pointCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">x0 (Last Price)</p>
              <p className="text-2xl font-semibold text-gray-900">${Number(analysis.x0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Average Price</p>
              <p className="text-2xl font-semibold text-gray-900">${Number(analysis.averagePrice).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {getTrendIcon(analysis.trendDirection)}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Trend Direction</p>
              <p className={`text-2xl font-semibold ${analysis.trendDirection === 'UP' ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.trendDirection}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Range */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Price Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Minimum Price</p>
            <p className="text-2xl font-semibold text-red-600">${Number(analysis.minPrice).toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Maximum Price</p>
            <p className="text-2xl font-semibold text-green-600">${Number(analysis.maxPrice).toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Price Range</p>
            <p className="text-2xl font-semibold text-gray-900">
              ${(Number(analysis.maxPrice) - Number(analysis.minPrice)).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Data Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Chart Data</h3>
        <div className="text-sm text-gray-600">
          <p>This segment contains {chartData.length} data points with OHLCV data.</p>
          <p className="mt-1">Time range: {formatTime(chartData[0]?.timestamp || '')} to {formatTime(chartData[chartData.length - 1]?.timestamp || '')}</p>
        </div>
      </div>
    </div>
  );
}
