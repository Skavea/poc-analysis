/**
 * Page 3: Segment Detail Page
 * ===========================
 * 
 * Shows the dataset graphically and allows enhancement
 * Left: Chart visualization, Right: Data and enhancement options
 */

'use client';

import { useState, useEffect, use } from 'react';
import { DatabaseService } from '@/lib/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Clock, BarChart3, Save, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Client-side only component to avoid hydration issues
const ClientOnlyRadioGroup = dynamic(() => Promise.resolve(({ schemaType, setSchemaType }: any) => (
  <div className="space-y-2">
    <label className="flex items-center space-x-2">
      <input
        type="radio"
        name="schemaType"
        value="R"
        checked={schemaType === 'R'}
        onChange={(e) => setSchemaType(e.target.value as 'R')}
        className="text-blue-600"
      />
      <span className="text-sm">R Schema</span>
    </label>
    <label className="flex items-center space-x-2">
      <input
        type="radio"
        name="schemaType"
        value="V"
        checked={schemaType === 'V'}
        onChange={(e) => setSchemaType(e.target.value as 'V')}
        className="text-blue-600"
      />
      <span className="text-sm">V Schema</span>
    </label>
  </div>
)), { ssr: false });

interface SegmentPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ChartDataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SegmentData {
  analysis: any;
  chartData: ChartDataPoint[];
}

export default function SegmentPage({ params }: SegmentPageProps) {
  const resolvedParams = use(params);
  const [segmentData, setSegmentData] = useState<SegmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schemaType, setSchemaType] = useState<'R' | 'V' | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadSegmentData();
  }, [resolvedParams.id]);

  const loadSegmentData = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getSegmentData(resolvedParams.id);
      setSegmentData(data);
      if (data) {
        setSchemaType(data.analysis.schema_type);
      }
    } catch (error) {
      console.error('Error loading segment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveEnhancement = async () => {
    if (!segmentData) return;
    
    setSaving(true);
    try {
      await DatabaseService.updateAnalysisEnhancement(
        resolvedParams.id,
        true,
        schemaType
      );
      
      // Reload data to show updated state
      await loadSegmentData();
    } catch (error) {
      console.error('Error saving enhancement:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetEnhancement = async () => {
    if (!segmentData) return;
    
    setSaving(true);
    try {
      await DatabaseService.updateAnalysisEnhancement(
        resolvedParams.id,
        false,
        null
      );
      
      setSchemaType(null);
      await loadSegmentData();
    } catch (error) {
      console.error('Error resetting enhancement:', error);
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!segmentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Segment not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The requested segment could not be found.
          </p>
        </div>
      </div>
    );
  }

  const { analysis, chartData } = segmentData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Segment Analysis
              </h1>
              <p className="mt-2 text-gray-600">
                {analysis.symbol} • {formatDate(analysis.date)} • {formatTime(analysis.segment_start)} - {formatTime(analysis.segment_end)}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Price Chart
                </h2>
                <div className="flex items-center space-x-2">
                  {analysis.trend_direction === 'UP' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {analysis.trend_direction}
                  </span>
                </div>
              </div>

              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTime}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      domain={['dataMin - 0.5', 'dataMax + 0.5']}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => formatTime(value)}
                      formatter={(value: any, name: string) => [
                        `$${Number(value).toFixed(2)}`,
                        name === 'close' ? 'Price' : name
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="close" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Data Section */}
          <div className="space-y-6">
            {/* Analysis Data */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Analysis Data
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Symbol</div>
                    <div className="font-medium">{analysis.symbol}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Points</div>
                    <div className="font-medium">{analysis.point_count}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">x0 (Last Price)</div>
                    <div className="font-medium">${Number(analysis.x0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Average</div>
                    <div className="font-medium">${Number(analysis.average_price).toFixed(2)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Min Price</div>
                    <div className="font-medium">${Number(analysis.min_price).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Max Price</div>
                    <div className="font-medium">${Number(analysis.max_price).toFixed(2)}</div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-500">Trend Direction</div>
                  <div className="flex items-center space-x-2">
                    {analysis.trend_direction === 'UP' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium text-gray-900">
                      {analysis.trend_direction}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhancement Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Enhancement
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500 mb-2">Status</div>
                  {analysis.enhanced ? (
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                        Enhanced
                      </span>
                      {analysis.schema_type && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {analysis.schema_type}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                      Not Enhanced
                    </span>
                  )}
                </div>

                {!analysis.enhanced && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Schema Type</div>
                    <ClientOnlyRadioGroup
                      schemaType={schemaType}
                      setSchemaType={setSchemaType}
                    />
                  </div>
                )}

                <div className="pt-4 border-t">
                  {analysis.enhanced ? (
                    <button
                      onClick={resetEnhancement}
                      disabled={saving}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{saving ? 'Resetting...' : 'Reset Enhancement'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={saveEnhancement}
                      disabled={saving || !schemaType}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{saving ? 'Saving...' : 'Save Enhancement'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
