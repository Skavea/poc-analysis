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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
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
        className="text-red-600"
      />
      <span className="text-sm font-medium text-red-800">R Schema</span>
    </label>
    <label className="flex items-center space-x-2">
      <input
        type="radio"
        name="schemaType"
        value="V"
        checked={schemaType === 'V'}
        onChange={(e) => setSchemaType(e.target.value as 'V')}
        className="text-purple-600"
      />
      <span className="text-sm font-medium text-purple-800">V Schema</span>
    </label>
    <label className="flex items-center space-x-2">
      <input
        type="radio"
        name="schemaType"
        value="UNCLASSIFIED"
        checked={schemaType === 'UNCLASSIFIED'}
        onChange={(e) => setSchemaType(e.target.value as 'UNCLASSIFIED')}
        className="text-gray-600"
      />
      <span className="text-sm text-gray-600">Unclassified</span>
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
  isX0?: boolean;
  isMin?: boolean;
  isMax?: boolean;
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
  const [schemaType, setSchemaType] = useState<'R' | 'V' | 'UNCLASSIFIED'>('UNCLASSIFIED');
  const router = useRouter();

  useEffect(() => {
    loadSegmentData();
  }, [resolvedParams.id]);

  const loadSegmentData = async () => {
    try {
      setLoading(true);
      console.log('Loading segment data for ID:', resolvedParams.id);
      const data = await DatabaseService.getSegmentData(resolvedParams.id);
      console.log('Segment data loaded:', data);
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

  const saveSchema = async () => {
    if (!segmentData) return;
    
    setSaving(true);
    try {
      await DatabaseService.updateAnalysisSchema(
        resolvedParams.id,
        schemaType
      );
      
      // Reload data to show updated state
      await loadSegmentData();
    } catch (error) {
      console.error('Error saving schema type:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetSchema = async () => {
    if (!segmentData) return;
    
    setSaving(true);
    try {
      await DatabaseService.updateAnalysisSchema(
        resolvedParams.id,
        'UNCLASSIFIED'
      );
      
      setSchemaType('UNCLASSIFIED');
      await loadSegmentData();
    } catch (error) {
      console.error('Error resetting schema type:', error);
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

  // Custom dot component for x0
  const X0Dot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload?.isX0) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="#EF4444" stroke="#FFFFFF" strokeWidth={2} />
          <text x={cx} y={cy - 12} textAnchor="middle" fontSize="10" fill="#EF4444" fontWeight="bold">
            x0
          </text>
        </g>
      );
    }
    return null;
  };

  // Custom dot component for min/max
  const MinMaxDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload?.isMin) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={4} fill="#10B981" stroke="#FFFFFF" strokeWidth={2} />
          <text x={cx} y={cy - 10} textAnchor="middle" fontSize="8" fill="#10B981" fontWeight="bold">
            min
          </text>
        </g>
      );
    }
    if (payload?.isMax) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={4} fill="#8B5CF6" stroke="#FFFFFF" strokeWidth={2} />
          <text x={cx} y={cy - 10} textAnchor="middle" fontSize="8" fill="#8B5CF6" fontWeight="bold">
            max
          </text>
        </g>
      );
    }
    return null;
  };

  // Enhance chart data with markers
  const enhancedChartData = segmentData ? segmentData.chartData.map((point, index) => {
    const isLast = index === segmentData.chartData.length - 1;
    const isMin = Number(point.close) === Number(segmentData.analysis.min_price);
    const isMax = Number(point.close) === Number(segmentData.analysis.max_price);
    
    return {
      ...point,
      isX0: isLast,
      isMin,
      isMax
    };
  }) : [];

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
                  <LineChart data={enhancedChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTime}
                      tick={{ fontSize: 12 }}
                      stroke="#6B7280"
                    />
                    <YAxis 
                      domain={['dataMin - 0.5', 'dataMax + 0.5']}
                      tick={{ fontSize: 12 }}
                      stroke="#6B7280"
                    />
                    <Tooltip 
                      labelFormatter={(value) => formatTime(value)}
                      formatter={(value: any, name: string) => [
                        `$${Number(value).toFixed(2)}`,
                        name === 'close' ? 'Price' : name
                      ]}
                      contentStyle={{
                        backgroundColor: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                    
                    {/* Reference line for average price */}
                    <ReferenceLine 
                      y={Number(segmentData.analysis.average_price)} 
                      stroke="#F59E0B" 
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{ value: "Avg", position: "topRight", fill: "#F59E0B", fontSize: 12 }}
                    />
                    
                    {/* Reference line for min price */}
                    <ReferenceLine 
                      y={Number(segmentData.analysis.min_price)} 
                      stroke="#10B981" 
                      strokeDasharray="2 2"
                      strokeWidth={1}
                      label={{ value: "Min", position: "topLeft", fill: "#10B981", fontSize: 10 }}
                    />
                    
                    {/* Reference line for max price */}
                    <ReferenceLine 
                      y={Number(segmentData.analysis.max_price)} 
                      stroke="#8B5CF6" 
                      strokeDasharray="2 2"
                      strokeWidth={1}
                      label={{ value: "Max", position: "topLeft", fill: "#8B5CF6", fontSize: 10 }}
                    />
                    
                    {/* Main price line */}
                    <Line 
                      type="monotone" 
                      dataKey="close" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 4, fill: '#3B82F6' }}
                    />
                    
                    {/* Custom dots for special points */}
                    <Line 
                      type="monotone" 
                      dataKey="close" 
                      stroke="transparent" 
                      strokeWidth={0}
                      dot={<X0Dot />}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="close" 
                      stroke="transparent" 
                      strokeWidth={0}
                      dot={<MinMaxDot />}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Chart Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">x0 (Last Point)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-0.5 bg-amber-500" style={{borderTop: '2px dashed #F59E0B'}}></div>
                  <span className="text-gray-600">Average Price</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">Min Price</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-gray-600">Max Price</span>
                </div>
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
                  {analysis.schema_type === 'R' && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full font-medium">
                      R Schema
                    </span>
                  )}
                  {analysis.schema_type === 'V' && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-medium">
                      V Schema
                    </span>
                  )}
                  {analysis.schema_type === 'UNCLASSIFIED' && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                      Unclassified
                    </span>
                  )}
                </div>

                {analysis.schema_type === 'UNCLASSIFIED' && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Schema Type</div>
                    <ClientOnlyRadioGroup
                      schemaType={schemaType}
                      setSchemaType={setSchemaType}
                    />
                  </div>
                )}

                <div className="pt-4 border-t">
                  {analysis.schema_type !== 'UNCLASSIFIED' ? (
                    <button
                      onClick={resetSchema}
                      disabled={saving}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{saving ? 'Resetting...' : 'Reset to Unclassified'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={saveSchema}
                      disabled={saving}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      <span>{saving ? 'Saving...' : 'Save Schema Type'}</span>
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
