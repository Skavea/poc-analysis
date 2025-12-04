'use client';

import { useState, useEffect } from 'react';
import { 
  Button, 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Field,
  Spinner
} from '@chakra-ui/react';
import { Brain, X } from 'lucide-react';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClassify: (simpleModelPath: string | null, directeModelPath: string | null) => void;
  archivedSimpleModels: string[];
  archivedDirecteModels: string[];
  isLoadingArchived: boolean;
  isClassifying: boolean;
}

function ModelSelectionModal({ 
  isOpen, 
  onClose, 
  onClassify,
  archivedSimpleModels,
  archivedDirecteModels,
  isLoadingArchived,
  isClassifying
}: ModelSelectionModalProps) {
  const [modelType, setModelType] = useState<'simple' | 'mixed'>('simple');
  
  // État pour le modèle simple
  const [simpleModelSource, setSimpleModelSource] = useState<'latest' | 'archived'>('latest');
  const [selectedSimpleArchived, setSelectedSimpleArchived] = useState<string>('');
  
  // État pour le modèle directe (mode mixte)
  const [directeModelSource, setDirecteModelSource] = useState<'latest' | 'archived'>('latest');
  const [selectedDirecteArchived, setSelectedDirecteArchived] = useState<string>('');

  if (!isOpen) return null;

  const handleClassify = () => {
    let simpleModelPath: string | null = null;
    let directeModelPath: string | null = null;
    
    if (modelType === 'simple') {
      if (simpleModelSource === 'latest') {
        simpleModelPath = 'simple'; // Utiliser le dernier modèle simple
      } else if (simpleModelSource === 'archived' && selectedSimpleArchived) {
        simpleModelPath = `archives/simple/${selectedSimpleArchived}`;
      } else {
        alert('Veuillez sélectionner un modèle archivé');
        return;
      }
    } else {
      // Modèle mixte - les deux modèles sont requis
      if (simpleModelSource === 'latest') {
        simpleModelPath = 'simple';
      } else if (simpleModelSource === 'archived' && selectedSimpleArchived) {
        simpleModelPath = `archives/simple/${selectedSimpleArchived}`;
      } else {
        alert('Veuillez sélectionner un modèle simple');
        return;
      }
      
      if (directeModelSource === 'latest') {
        directeModelPath = 'directe';
      } else if (directeModelSource === 'archived' && selectedDirecteArchived) {
        directeModelPath = `archives/directe/${selectedDirecteArchived}`;
      } else {
        alert('Veuillez sélectionner un modèle directe');
        return;
      }
    }
    
    onClassify(simpleModelPath, directeModelPath);
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
        maxW="600px"
        w="90%"
        border="1px solid"
        borderColor="border.default"
        onClick={(e) => e.stopPropagation()}
      >
        <VStack gap={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold">
              Configuration de la classification ML
            </Text>
            <Button onClick={onClose} variant="ghost" size="sm" disabled={isClassifying}>
              <X size={20} />
            </Button>
          </HStack>
          
          {/* Sélection du type de modèle */}
          <Field.Root>
            <Field.Label>Type de modèle</Field.Label>
            <select
              value={modelType}
              onChange={(e) => {
                setModelType(e.target.value as 'simple' | 'mixed');
                setSimpleModelSource('latest');
                setSelectedSimpleArchived('');
                setDirecteModelSource('latest');
                setSelectedDirecteArchived('');
              }}
              disabled={isClassifying}
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
              <option value="simple">Modèle simple</option>
              <option value="mixed">Modèle mixte</option>
            </select>
          </Field.Root>

          {/* Si modèle simple, afficher les options */}
          {modelType === 'simple' && (
            <>
              <Field.Root>
                <Field.Label>Source du modèle</Field.Label>
                <select
                  value={simpleModelSource}
                  onChange={(e) => {
                    setSimpleModelSource(e.target.value as 'latest' | 'archived');
                    setSelectedSimpleArchived('');
                  }}
                  disabled={isClassifying}
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
                  <option value="latest">Dernier modèle</option>
                  <option value="archived">Modèle archivé</option>
                </select>
              </Field.Root>

              {/* Si modèle archivé, afficher la liste */}
              {simpleModelSource === 'archived' && (
                <Field.Root>
                  <Field.Label>Modèle archivé</Field.Label>
                  {isLoadingArchived ? (
                    <HStack gap={2}>
                      <Spinner size="sm" />
                      <Text fontSize="sm" color="fg.muted">Chargement...</Text>
                    </HStack>
                  ) : archivedSimpleModels.length === 0 ? (
                    <Text fontSize="sm" color="fg.muted">Aucun modèle archivé disponible</Text>
                  ) : (
                    <select
                      value={selectedSimpleArchived}
                      onChange={(e) => setSelectedSimpleArchived(e.target.value)}
                      disabled={isClassifying}
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
                      {archivedSimpleModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  )}
                </Field.Root>
              )}
            </>
          )}

          {/* Si modèle mixte, afficher 2 sections */}
          {modelType === 'mixed' && (
            <>
              {/* Section Modèle Simple */}
              <Box borderTop="1px solid" borderColor="border.default" pt={4}>
                <Text fontSize="md" fontWeight="semibold" mb={3}>
                  Modèle Simple
                </Text>
                <VStack gap={3} align="stretch">
                  <Field.Root>
                    <Field.Label>Source du modèle simple</Field.Label>
                    <select
                      value={simpleModelSource}
                      onChange={(e) => {
                        setSimpleModelSource(e.target.value as 'latest' | 'archived');
                        setSelectedSimpleArchived('');
                      }}
                      disabled={isClassifying}
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
                      <option value="latest">Dernier modèle</option>
                      <option value="archived">Modèle archivé</option>
                    </select>
                  </Field.Root>

                  {simpleModelSource === 'archived' && (
                    <Field.Root>
                      <Field.Label>Modèle simple archivé</Field.Label>
                      {isLoadingArchived ? (
                        <HStack gap={2}>
                          <Spinner size="sm" />
                          <Text fontSize="sm" color="fg.muted">Chargement...</Text>
                        </HStack>
                      ) : archivedSimpleModels.length === 0 ? (
                        <Text fontSize="sm" color="fg.muted">Aucun modèle archivé disponible</Text>
                      ) : (
                        <select
                          value={selectedSimpleArchived}
                          onChange={(e) => setSelectedSimpleArchived(e.target.value)}
                          disabled={isClassifying}
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
                          {archivedSimpleModels.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field.Root>
                  )}
                </VStack>
              </Box>

              {/* Section Modèle Directe */}
              <Box borderTop="1px solid" borderColor="border.default" pt={4}>
                <Text fontSize="md" fontWeight="semibold" mb={3}>
                  Modèle Directe
                </Text>
                <VStack gap={3} align="stretch">
                  <Field.Root>
                    <Field.Label>Source du modèle directe</Field.Label>
                    <select
                      value={directeModelSource}
                      onChange={(e) => {
                        setDirecteModelSource(e.target.value as 'latest' | 'archived');
                        setSelectedDirecteArchived('');
                      }}
                      disabled={isClassifying}
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
                      <option value="latest">Dernier modèle</option>
                      <option value="archived">Modèle archivé</option>
                    </select>
                  </Field.Root>

                  {directeModelSource === 'archived' && (
                    <Field.Root>
                      <Field.Label>Modèle directe archivé</Field.Label>
                      {isLoadingArchived ? (
                        <HStack gap={2}>
                          <Spinner size="sm" />
                          <Text fontSize="sm" color="fg.muted">Chargement...</Text>
                        </HStack>
                      ) : archivedDirecteModels.length === 0 ? (
                        <Text fontSize="sm" color="fg.muted">Aucun modèle archivé disponible</Text>
                      ) : (
                        <select
                          value={selectedDirecteArchived}
                          onChange={(e) => setSelectedDirecteArchived(e.target.value)}
                          disabled={isClassifying}
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
                          {archivedDirecteModels.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field.Root>
                  )}
                </VStack>
              </Box>
            </>
          )}

          <HStack gap={2} justify="flex-end">
            <Button onClick={onClose} variant="outline" disabled={isClassifying}>
              Annuler
            </Button>
            <Button 
              onClick={handleClassify} 
              colorPalette="purple"
              disabled={
                isClassifying || 
                (modelType === 'simple' && simpleModelSource === 'archived' && !selectedSimpleArchived) ||
                (modelType === 'mixed' && (
                  (simpleModelSource === 'archived' && !selectedSimpleArchived) ||
                  (directeModelSource === 'archived' && !selectedDirecteArchived)
                ))
              }
            >
              {isClassifying ? (
                <>
                  <Spinner size="sm" mr={2} />
                  Classification en cours...
                </>
              ) : (
                <>
                  <Brain size={16} style={{ marginRight: '8px' }} />
                  Lancer la classification
                </>
              )}
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
}

/**
 * Bouton client pour déclencher la classification ML
 * Classe tous les segments invalid = false et (ml_classed = false ou ml_result = 'UNCLASSIFIED')
 */
export default function MlClassificationButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [archivedSimpleModels, setArchivedSimpleModels] = useState<string[]>([]);
  const [archivedDirecteModels, setArchivedDirecteModels] = useState<string[]>([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      loadArchivedModels();
    }
  }, [isModalOpen]);

  const loadArchivedModels = async () => {
    try {
      setIsLoadingArchived(true);
      const [simpleResponse, directeResponse] = await Promise.all([
        fetch('/api/ml-archived-models?type=simple'),
        fetch('/api/ml-archived-models?type=directe')
      ]);
      
      if (simpleResponse.ok) {
        const data = await simpleResponse.json();
        setArchivedSimpleModels(data.models || []);
      }
      
      if (directeResponse.ok) {
        const data = await directeResponse.json();
        setArchivedDirecteModels(data.models || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des modèles archivés:', error);
      setArchivedSimpleModels([]);
      setArchivedDirecteModels([]);
    } finally {
      setIsLoadingArchived(false);
    }
  };

  async function handleClassify(simpleModelPath: string | null, directeModelPath: string | null) {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setIsModalOpen(false);
    
    try {
      const body = JSON.stringify({ 
        simpleModelPath,
        directeModelPath 
      });
      const res = await fetch('/api/ml-classify', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
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
        onClick={() => setIsModalOpen(true)}
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
      
      <ModelSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClassify={handleClassify}
        archivedSimpleModels={archivedSimpleModels}
        archivedDirecteModels={archivedDirecteModels}
        isLoadingArchived={isLoadingArchived}
        isClassifying={loading}
      />
      
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


