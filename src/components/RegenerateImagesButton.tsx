'use client';

import { useState } from 'react';
import { Button } from '@chakra-ui/react';
import { RefreshCw } from 'lucide-react';

/**
 * Bouton client pour régénérer toutes les images de segments
 */
export default function RegenerateImagesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onClick() {
    if (loading) return; // Empêcher les doubles clics
    
    setLoading(true);
    setResult(null);
    
    try {
      const res = await fetch('/api/regenerate-images', { method: 'POST' });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        setResult('Erreur lors de la régénération');
      } else {
        setResult(`✓ Régénéré: ${json.count} images`);
      }
    } catch (error) {
      console.error('Erreur régénération:', error);
      setResult('✗ Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button 
        onClick={onClick} 
        colorPalette="orange" 
        size="md" 
        w="full" 
        disabled={loading}
        style={{ cursor: loading ? 'wait' : 'pointer' }}
      >
        <RefreshCw 
          size={18} 
          style={{ 
            marginRight: '8px',
            animation: loading ? 'spin 1s linear infinite' : 'none',
          }} 
        />
        {loading ? 'Régénération en cours…' : 'Régénérer images'}
      </Button>
      {result && (
        <div style={{ 
          marginTop: 8, 
          fontSize: 12, 
          color: result.startsWith('✓') ? 'var(--chakra-colors-green-600)' : 'var(--chakra-colors-red-600)' 
        }}>
          {result}
        </div>
      )}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}


