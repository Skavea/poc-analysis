/**
 * Client Component: Export Classified CSV Button
 * ===============================================
 * 
 * Bouton pour exporter les données classées au format CSV
 */

'use client';

import { useState } from 'react';
import { Button, Spinner } from "@chakra-ui/react";
import { Download } from 'lucide-react';

export default function ExportClassifiedCsvButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Appeler l'API pour générer et télécharger le CSV
      const response = await fetch('/api/export-classified-csv');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || 'Erreur lors de la génération du CSV');
      }

      // Récupérer le contenu du CSV
      const csvContent = await response.text();
      
      // Créer un blob et télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extraire le nom de fichier depuis les headers ou utiliser un nom par défaut
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `classified-data-${new Date().toISOString().split('T')[0]}.csv`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      alert('Erreur lors de l\'export: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      colorPalette="green"
      variant="outline"
      size="md"
      w="full"
      disabled={isExporting}
    >
      {isExporting ? (
        <>
          <Spinner size="sm" mr={2} />
          Export en cours...
        </>
      ) : (
        <>
          <Download size={18} style={{ marginRight: '8px' }} />
          Exporter CSV classé
        </>
      )}
    </Button>
  );
}
