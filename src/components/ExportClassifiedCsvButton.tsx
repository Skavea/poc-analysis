/**
 * Client Component: Export Classified CSV Button
 * ===============================================
 * 
 * Bouton pour exporter les données classées au format CSV
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Button, 
  Spinner, 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Field
} from "@chakra-ui/react";
import { Download, X } from 'lucide-react';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (modelName: string | null, modelType: 'simple' | 'directe') => void;
  models: string[];
  isExporting: boolean;
  isLoadingModels: boolean;
}

function ModelSelectionModal({ 
  isOpen, 
  onClose, 
  onExport, 
  models,
  isExporting,
  isLoadingModels
}: ModelSelectionModalProps) {
  const [modelType, setModelType] = useState<'simple' | 'directe'>('simple');
  const [selectedModel, setSelectedModel] = useState<string>('');

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(selectedModel || null, modelType);
  };

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={1000}
      bg="rgba(0, 0, 0, 0.7)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={onClose}
    >
      <Box
        bg="white"
        _dark={{ bg: "gray.800" }}
        p={6}
        rounded="lg"
        shadow="xl"
        maxW="500px"
        w="90%"
        border="1px solid"
        borderColor="border.default"
        onClick={(e) => e.stopPropagation()}
      >
        <VStack gap={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold">
              Sélectionner un modèle
            </Text>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X size={20} />
            </Button>
          </HStack>
          
          <Text fontSize="sm" color="fg.muted">
            Choisissez le type de modèle et le modèle de classification pour exporter uniquement les données correspondantes.
          </Text>

          <Field.Root>
            <Field.Label>Type de modèle</Field.Label>
            <select
              value={modelType}
              onChange={(e) => {
                setModelType(e.target.value as 'simple' | 'directe');
                setSelectedModel('');
              }}
              disabled={isExporting}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid var(--chakra-colors-border-default)',
                borderRadius: 'var(--chakra-radii-md)',
                background: 'var(--chakra-colors-bg-default)',
                color: 'var(--chakra-colors-fg-default)',
                width: '100%',
              }}
            >
              <option value="simple">Simple</option>
              <option value="directe">Directe</option>
            </select>
          </Field.Root>

          <Field.Root>
            <Field.Label>Modèle de classification</Field.Label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isExporting || isLoadingModels}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid var(--chakra-colors-border-default)',
                borderRadius: 'var(--chakra-radii-md)',
                background: 'var(--chakra-colors-bg-default)',
                color: 'var(--chakra-colors-fg-default)',
                width: '100%',
              }}
            >
              <option value="">Sélectionner un modèle...</option>
              {isLoadingModels ? (
                <option disabled>Chargement...</option>
              ) : (
                models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              )}
            </select>
          </Field.Root>

          <HStack gap={2} justify="flex-end">
            <Button onClick={onClose} variant="outline" disabled={isExporting}>
              Annuler
            </Button>
            <Button 
              onClick={handleExport} 
              colorPalette="green"
              disabled={!selectedModel || isExporting}
            >
              {isExporting ? (
                <>
                  <Spinner size="sm" mr={2} />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download size={16} style={{ marginRight: '8px' }} />
                  Exporter
                </>
              )}
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
}

export default function ExportClassifiedCsvButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelType, setModelType] = useState<'simple' | 'directe'>('simple');

  useEffect(() => {
    if (isModalOpen) {
      loadModels(modelType);
    }
  }, [isModalOpen, modelType]);

  const loadModels = async (type: 'simple' | 'directe') => {
    try {
      setIsLoadingModels(true);
      const response = await fetch(`/api/ml-models?type=${type}`);
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      } else {
        console.error('Erreur lors du chargement des modèles');
        setModels([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des modèles:', error);
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleExportClick = () => {
    setIsModalOpen(true);
  };

  const handleExport = async (modelName: string | null, modelType: 'simple' | 'directe') => {
    try {
      setIsExporting(true);
      
      // Construire l'URL avec les paramètres ml_model_name et model_type si sélectionné
      const params = new URLSearchParams();
      if (modelName) {
        params.append('ml_model_name', modelName);
      }
      params.append('model_type', modelType);
      
      const url = `/api/export-classified-csv?${params.toString()}`;
      
      // Appeler l'API pour générer et télécharger le CSV
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        if (response.status === 404) {
          alert(errorData.error || 'Aucune donnée classée disponible pour le moment.');
          return;
        }
        throw new Error(errorData.error || 'Erreur lors de la génération du CSV');
      }

      // Récupérer le contenu du CSV
      const csvContent = await response.text();
      
      // Créer un blob et télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const urlObj = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlObj;
      
      // Extraire le nom de fichier depuis les headers ou utiliser un nom par défaut
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `classified-data-${modelName ? modelName.replace('.json', '') + '-' : ''}${new Date().toISOString().split('T')[0]}.csv`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(urlObj);
      
      setIsModalOpen(false);
      
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      alert('Erreur lors de l\'export: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleExportClick}
        colorPalette="green"
        variant="outline"
        size="md"
        w="full"
        disabled={isExporting}
      >
        <Download size={18} style={{ marginRight: '8px' }} />
        Exporter CSV classé
      </Button>

      <ModelSelectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModelType('simple');
        }}
        onExport={handleExport}
        models={models}
        isExporting={isExporting}
        isLoadingModels={isLoadingModels}
      />
    </>
  );
}
