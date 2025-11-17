'use client';

import { useState } from 'react';
import { Button } from '@chakra-ui/react';
import { Brain } from 'lucide-react';

/**
 * Bouton client pour déclencher la classification ML
 * Classe tous les segments invalid = false et (ml_classed = false ou ml_result = 'UNCLASSIFIED')
 */
export default function MlClassificationButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onClick() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ml-classify', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setResult('Erreur pendant la classification ML');
      } else {
        setResult(`✓ ML classed: ${json.updated}`);
      }
    } catch (e) {
      console.error(e);
      setResult('✗ Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        onClick={onClick}
        colorPalette="purple"
        size="md"
        w="full"
        disabled={loading}
        style={{ cursor: loading ? 'wait' : 'pointer' }}
      >
        <Brain
          size={18}
          style={{
            marginRight: '8px',
            animation: loading ? 'pulse 1s ease-in-out infinite' : 'none',
          }}
        />
        {loading ? 'ML classifying...' : 'ML classification'}
      </Button>
      {result && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: result.startsWith('✓') ? 'var(--chakra-colors-green-600)' : 'var(--chakra-colors-red-600)',
          }}
        >
          {result}
        </div>
      )}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}


