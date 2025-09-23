/**
 * Segment Card Component
 * ======================
 * 
 * Displays individual segment analysis results
 */

'use client';

import { useState } from 'react';
import { AnalysisResult } from '@/lib/database';
import { TrendingUp, TrendingDown, Clock, BarChart3, Eye } from 'lucide-react';
import { SegmentChart } from './SegmentChart';

interface SegmentCardProps {
  analysis: AnalysisResult;
}

export function SegmentCard({ analysis }: SegmentCardProps) {
  const [showChart, setShowChart] = useState(false);

  const isUpTrend = analysis.trend_direction === 'UP';
  const trendColor = isUpTrend ? 'text-green-600' : 'text-red-600';
  const trendBgColor = isUpTrend ? 'bg-green-50' : 'bg-red-50';
  const trendIcon = isUpTrend ? TrendingUp : TrendingDown;

  const TrendIcon = trendIcon;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-gray-900">
            {analysis.symbol}
          </span>
          <span className="text-sm text-gray-500">
            {formatDate(analysis.date)}
          </span>
        </div>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${trendBgColor}`}>
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          <span className={`text-sm font-medium ${trendColor}`}>
            {analysis.trend_direction}
          </span>
        </div>
      </div>

      {/* Time Range */}
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">
          {formatTime(analysis.segment_start)} - {formatTime(analysis.segment_end)}
        </span>
        <span className="text-sm text-gray-500">
          ({analysis.point_count} points)
        </span>
      </div>

      {/* Price Analysis */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">x0 (Last Price)</p>
          <p className="text-lg font-semibold text-gray-900">
            ${analysis.x0.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Average</p>
          <p className="text-lg font-semibold text-gray-900">
            ${analysis.average_price.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Min Price</p>
          <p className="text-sm text-gray-700">
            ${analysis.min_price.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Max Price</p>
          <p className="text-sm text-gray-700">
            ${analysis.max_price.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Chart Toggle */}
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={() => setShowChart(!showChart)}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Eye className="h-4 w-4" />
          <span>{showChart ? 'Hide' : 'Show'} Chart</span>
        </button>
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <BarChart3 className="h-3 w-3" />
          <span>Segment Analysis</span>
        </div>
      </div>

      {/* Chart */}
      {showChart && (
        <div className="mt-4 pt-4 border-t">
          <SegmentChart segmentId={analysis.id} />
        </div>
      )}
    </div>
  );
}

