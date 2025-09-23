'use client';

import { useEffect } from 'react';

interface AnalysisStatusScriptProps {
  hasExistingAnalysis: boolean;
}

export default function AnalysisStatusScript({ hasExistingAnalysis }: AnalysisStatusScriptProps) {
  useEffect(() => {
    // Dispatch custom event to notify about analysis status
    const event = new CustomEvent('analysisStatusChanged', {
      detail: { hasAnalysis: hasExistingAnalysis }
    });
    window.dispatchEvent(event);
  }, [hasExistingAnalysis]);
  
  // This component doesn't render anything
  return null;
}
