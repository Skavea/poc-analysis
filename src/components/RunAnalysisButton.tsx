/**
 * Client Component: Run Analysis Button
 * ====================================
 * 
 * Client-side button for running analysis
 */

'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button, Spinner } from "@chakra-ui/react";

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
    <Button
      onClick={handleRunAnalysis}
      disabled={isRunning}
      colorPalette="blue"
      size="md"
      px={4}
      fontWeight="medium"
    >
      {isRunning ? (
        <>
          <Spinner size="sm" mr={2} />
          Running Analysis...
        </>
      ) : (
        <>
          <Play size={16} style={{ marginRight: '8px' }} />
          Run Analysis
        </>
      )}
    </Button>
  );
}