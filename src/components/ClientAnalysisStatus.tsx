'use client';

import { useState, useEffect } from 'react';
import AnalysisStatusAction from './AnalysisStatusAction';

interface ClientAnalysisStatusProps {
  symbol: string;
  initialStatus?: boolean;
}

export default function ClientAnalysisStatus({ symbol, initialStatus = false }: ClientAnalysisStatusProps) {
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(initialStatus);
  
  // Listen for changes in status via a custom event
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent<{ hasAnalysis: boolean }>) => {
      setHasExistingAnalysis(event.detail.hasAnalysis);
    };
    
    // Add event listener
    window.addEventListener('analysisStatusChanged', handleStatusChange as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('analysisStatusChanged', handleStatusChange as EventListener);
    };
  }, []);
  
  return (
    <AnalysisStatusAction 
      symbol={symbol} 
      hasExistingAnalysis={hasExistingAnalysis} 
    />
  );
}
