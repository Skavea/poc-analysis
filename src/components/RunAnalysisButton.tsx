/**
 * Client Component: Run Analysis Button
 * ====================================
 * 
 * Client-side button for running analysis
 */

'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import dynamic from 'next/dynamic';

// Client-side only component to avoid hydration issues
const ClientOnlyButton = dynamic(() => Promise.resolve(({ onClick, disabled, className, children }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={className}
  >
    {children}
  </button>
)), { ssr: false });

interface RunAnalysisButtonProps {
  symbol: string;
}

export default function RunAnalysisButton({ symbol }: RunAnalysisButtonProps) {
  const [isRunning, setIsRunning] = useState(false);

  const handleRunAnalysis = async () => {
    try {
      setIsRunning(true);
      const response = await fetch('/api/run-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });

      if (response.ok) {
        window.location.reload(); // Simple refresh to show new data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to run analysis');
      }
    } catch (error) {
      console.error('Error running analysis:', error);
      alert('Failed to run analysis');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <ClientOnlyButton
      onClick={handleRunAnalysis}
      disabled={isRunning}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isRunning ? (
        <>
          <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          Running...
        </>
      ) : (
        <>
          <Play className="h-4 w-4 mr-2" />
          Run Analysis
        </>
      )}
    </ClientOnlyButton>
  );
}