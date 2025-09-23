/**
 * Page 2: Analysis Page
 * =====================
 * 
 * Lists all sub-datasets for a specific stock
 * User can create new analysis or click on existing segments
 */

'use client';

import { useState, useEffect, use } from 'react';
import { DatabaseService, AnalysisResult } from '@/lib/database';
import { TrendingUp, TrendingDown, Clock, BarChart3, Play, Filter } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Client-side only component to avoid hydration issues
const ClientOnlySelect = dynamic(() => Promise.resolve(({ value, onChange, children }: any) => (
  <select
    value={value}
    onChange={onChange}
    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
  >
    {children}
  </select>
)), { ssr: false });

interface AnalysisPageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const resolvedParams = use(params);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'enhanced' | 'not_enhanced'>('all');
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);

  useEffect(() => {
    loadAnalysisResults();
  }, [resolvedParams.symbol]);

  const loadAnalysisResults = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getAnalysisResults(resolvedParams.symbol);
      setAnalysisResults(data);
      setHasExistingAnalysis(data.length > 0);
    } catch (error) {
      console.error('Error loading analysis results:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/run-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol: resolvedParams.symbol }),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadAnalysisResults();
        alert(`Analysis completed! Created ${result.segmentsCreated} segments.`);
      } else {
        if (response.status === 409) {
          // Analysis already exists - this is not an error, just inform the user
          alert(`Analysis already exists for ${resolvedParams.symbol}. Found ${result.message.split('Found ')[1]?.split(' existing')[0] || 'existing'} segments.`);
          await loadAnalysisResults(); // Refresh to show existing segments
        } else {
          alert(`Error: ${result.message}`);
        }
      }
    } catch (error) {
      console.error('Error running analysis:', error);
      alert('Error running analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
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

  const filteredResults = analysisResults.filter(result => {
    switch (filter) {
      case 'enhanced':
        return result.enhanced;
      case 'not_enhanced':
        return !result.enhanced;
      default:
        return true;
    }
  });

  const enhancedCount = analysisResults.filter(r => r.enhanced).length;
  const notEnhancedCount = analysisResults.filter(r => !r.enhanced).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Analysis: {resolvedParams.symbol}
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
        {/* Run Analysis */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {hasExistingAnalysis ? 'Analysis Status' : 'Create New Analysis'}
              </h2>
              <p className="text-sm text-gray-600">
                {hasExistingAnalysis 
                  ? `Analysis already exists for ${resolvedParams.symbol}. View existing segments below.`
                  : `Generate sub-datasets and trend analysis for ${resolvedParams.symbol}`
                }
              </p>
            </div>
            {!hasExistingAnalysis && (
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="h-4 w-4" />
                <span>{isAnalyzing ? 'Analyzing...' : 'Run Analysis'}</span>
              </button>
            )}
            {hasExistingAnalysis && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
                <BarChart3 className="h-4 w-4" />
                <span>Analysis Complete</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Analysis Results
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <ClientOnlySelect
                  value={filter}
                  onChange={(e: any) => setFilter(e.target.value as any)}
                >
                  <option value="all">All ({analysisResults.length})</option>
                  <option value="enhanced">Enhanced ({enhancedCount})</option>
                  <option value="not_enhanced">Not Enhanced ({notEnhancedCount})</option>
                </ClientOnlySelect>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analysisResults.length}
              </div>
              <div className="text-sm text-blue-600">Total Segments</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {enhancedCount}
              </div>
              <div className="text-sm text-green-600">Enhanced</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {notEnhancedCount}
              </div>
              <div className="text-sm text-gray-600">Not Enhanced</div>
            </div>
          </div>
        </div>

        {/* Results List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No analysis results found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Run the analysis to generate sub-datasets.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredResults.map((result) => (
              <Link
                key={result.id}
                href={`/segment/${result.id}`}
                className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {result.trend_direction === 'UP' ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {result.trend_direction}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {result.enhanced ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Enhanced
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        Not Enhanced
                      </span>
                    )}
                    {result.schema_type && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {result.schema_type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {formatTime(result.segment_start)} - {formatTime(result.segment_end)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <div>Date: {formatDate(result.date)}</div>
                    <div>Points: {result.point_count}</div>
                    <div>x0: ${Number(result.x0).toFixed(2)}</div>
                    <div>Avg: ${Number(result.average_price).toFixed(2)}</div>
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
    </div>
  );
}
