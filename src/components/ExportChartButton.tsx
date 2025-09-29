/**
 * Client Component: Export Chart Button
 * ====================================
 * 
 * Bouton d'export pour le graphique en SVG
 */

'use client';

import { Download } from 'lucide-react';
import { Button } from '@chakra-ui/react';

interface ExportChartButtonProps {
  analysis: {
    x0: string;
  };
}

export default function ExportChartButton({ analysis }: ExportChartButtonProps) {
  const handleExport = () => {
    try {
      // Trouver le SVG element dans le composant
      const svgElement = document.querySelector('.recharts-wrapper svg');
      if (!svgElement) {
        alert('Chart not found');
        return;
      }
      
      // Clone the SVG to avoid modifying the original
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      
      // Set proper dimensions and namespaces
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgClone.setAttribute('width', svgElement.clientWidth.toString());
      svgClone.setAttribute('height', svgElement.clientHeight.toString());
      
      // Convert SVG to string
      const svgString = new XMLSerializer().serializeToString(svgClone);
      
      // Create a blob and download link
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `chart-${analysis.x0}-${new Date().toISOString()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Chart exported successfully!');
      
    } catch (error) {
      console.error('Error exporting SVG:', error);
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <Button
      size="sm"
      colorPalette="blue"
      variant="outline"
      onClick={handleExport}
    >
      <Download size={14} style={{ marginRight: '8px' }} />
      Export SVG
    </Button>
  );
}
