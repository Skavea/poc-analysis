/**
 * Segment Chart Component
 * ======================
 * 
 * Displays chart visualization for a segment
 */

'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DatabaseService } from '@/lib/database';
import { Loader2 } from 'lucide-react';

interface SegmentChartProps {
  segmentId: string;
}

interface ChartDataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function SegmentChart({ segmentId }: SegmentChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChartData();
  }, [segmentId]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getSegmentData(segmentId);
      
      if (!data) {
        setError('No chart data available');
        return;
      }

      setAnalysis(data.analysis);
      setChartData(data.chartData);
    } catch (err) {
      setError('Failed to load chart data');
      console.error('Error loading chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No chart data available</p>
      </div>
    );
  }

  // Format data for chart
  const formattedData = chartData.map((point, index) => ({
    time: new Date(point.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }),
    close: point.close,
    high: point.high,
    low: point.low,
    open: point.open,
    index
  }));

  const isUpTrend = analysis?.trend_direction === 'UP';
  const lineColor = isUpTrend ? '#10b981' : '#ef4444';

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: any, name: string) => [
                `$${Number(value).toFixed(2)}`,
                name === 'close' ? 'Close Price' : name
              ]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: lineColor, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Analysis Summary */}
      {analysis && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-gray-500">x0</p>
            <p className="font-semibold">${analysis.x0.toFixed(2)}</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-gray-500">Average</p>
            <p className="font-semibold">${analysis.average_price.toFixed(2)}</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-gray-500">Range</p>
            <p className="font-semibold">
              ${analysis.min_price.toFixed(2)} - ${analysis.max_price.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

