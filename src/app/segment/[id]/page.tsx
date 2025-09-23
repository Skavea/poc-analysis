/**
 * Page 3: Segment Detail
 * ======================
 * 
 * Left: Interactive price chart (TradingView style)
 * Right: Analysis data and enhancement options
 * Choose R or V schema type
 * Save enhancement to mark segment as enhanced
 */

import { use } from 'react';
import { DatabaseService } from '@/lib/db';
import { TrendingUp, TrendingDown, Clock, BarChart3 } from 'lucide-react';
import SegmentChart from '@/components/SegmentChart';
import SchemaUpdateForm from '@/components/SchemaUpdateForm';

interface SegmentPageProps {
  params: Promise<{ id: string }>;
}

// Server component for segment data
async function SegmentDetailServer({ segmentId }: { segmentId: string }) {
  const segmentData = await DatabaseService.getSegmentData(segmentId);

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

  const { pointsData, ...analysis } = segmentData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Chart */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Chart</h2>
          <SegmentChart pointsData={pointsData} analysis={analysis} />
        </div>
      </div>

      {/* Right Column - Analysis Data */}
      <div className="space-y-6">
        {/* Analysis Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Summary</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Symbol</span>
              <span className="text-sm text-gray-900">{analysis.symbol}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Time Range</span>
              <span className="text-sm text-gray-900">
                {formatTime(analysis.segmentStart.toISOString())} - {formatTime(analysis.segmentEnd.toISOString())}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Data Points</span>
              <span className="text-sm text-gray-900">{analysis.pointCount}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Trend Direction</span>
              <div className="flex items-center space-x-2">
                {getTrendIcon(analysis.trendDirection)}
                <span className={`text-sm font-medium ${analysis.trendDirection === 'UP' ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.trendDirection}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Current Classification</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSchemaTypeColor(analysis.schemaType)}`}>
                {analysis.schemaType}
              </span>
            </div>
          </div>
        </div>

        {/* Price Analysis */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Analysis</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">x0 (Last Price)</p>
              <p className="text-2xl font-semibold text-gray-900">${Number(analysis.x0).toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Average Price</p>
              <p className="text-2xl font-semibold text-gray-900">${Number(analysis.averagePrice).toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Minimum Price</p>
              <p className="text-2xl font-semibold text-red-600">${Number(analysis.minPrice).toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Maximum Price</p>
              <p className="text-2xl font-semibold text-green-600">${Number(analysis.maxPrice).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Schema Update Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Classification</h2>
          <SchemaUpdateForm segmentId={analysis.id} initialSchemaType={analysis.schemaType} />
        </div>
      </div>
    </div>
  );
}


// Utility functions
function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
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
    <TrendingUp className="h-5 w-5 text-green-500" />
  ) : (
    <TrendingDown className="h-5 w-5 text-red-500" />
  );
}

// Main page component
export default function SegmentPage({ params }: SegmentPageProps) {
  const resolvedParams = use(params);
  const segmentId = resolvedParams.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Segment Analysis</h1>
              <p className="mt-2 text-gray-600">Detailed analysis and visualization</p>
            </div>
            <div className="flex items-center space-x-4">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SegmentDetailServer segmentId={segmentId} />
      </div>
    </div>
  );
}