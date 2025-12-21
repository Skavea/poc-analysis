/**
 * Client Component: Add Stock Form
 * ================================
 * 
 * Client-side form for adding new stocks using Chakra UI v3
 */

'use client';

import { useState } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Card,
  Input,
  Button,
  Field,
  Spinner,
} from "@chakra-ui/react";
import { Upload, Settings } from 'lucide-react';

type GenerationMode = 'auto' | 'manual';

export default function AddStockForm() {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('auto');

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    try {
      setIsAdding(true);
      setError('');
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', generationMode);
      
      const response = await fetch('/api/upload-market-data', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();

      if (response.ok && data.success) {
        setSelectedFile(null);
        
        // Si mode manuel et qu'un stream non terminé existe, rediriger vers le formulaire
        if (generationMode === 'manual' && data.data?.firstNonTerminatedStreamId) {
          window.location.href = `/manual-segment/${data.data.firstNonTerminatedStreamId}`;
        } else if (generationMode === 'manual' && data.data?.streams?.[0]?.id) {
          // Fallback: utiliser le premier stream si firstNonTerminatedStreamId n'est pas disponible
          window.location.href = `/manual-segment/${data.data.streams[0].id}`;
        } else {
          alert(data.message || 'Fichier traité avec succès !');
          window.location.reload();
        }
      } else {
        const errorMessage = data.message || data.error || 'Erreur lors du traitement du fichier';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Erreur lors de l\'upload du fichier');
    } finally {
      setIsAdding(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  return (
    <Card.Root className="animate-fade-in">
      <Card.Header pb={4}>
        <HStack gap={4}>
          <Box
            p={2}
            bg="brand.50"
            rounded="lg"
            color="brand.600"
          >
            <Upload size={24} />
          </Box>
          <VStack align="start" gap={0}>
            <Text fontSize="lg" fontWeight="bold" color="fg.default">
              Add New Market
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Upload a market data file
            </Text>
          </VStack>
        </HStack>
      </Card.Header>
  
      <Card.Body pt={0}>
        <form onSubmit={handleFileUpload}>
            <VStack gap={4} align="stretch">
              <Field.Root invalid={!!error} suppressHydrationWarning={true}>
                <Field.Label fontSize="sm" color="fg.muted">
                  Select File
                </Field.Label>
                <HStack gap={3} align="stretch">
                  <Input
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    disabled={isAdding}
                    size="md"
                    suppressHydrationWarning={true}
                    flex={1}
                  />
                  <Button
                    type="submit"
                    colorPalette="blue"
                    disabled={isAdding || !selectedFile}
                    minW="140px"
                    suppressHydrationWarning={true}
                  >
                    {isAdding ? (
                      <>
                        <Spinner size="sm" mr={2} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} style={{ marginRight: '8px' }} />
                        Upload
                      </>
                    )}
                  </Button>
                  <Box minW="180px" position="relative">
                    <select
                      value={generationMode}
                      onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
                      disabled={isAdding}
                      style={{
                        padding: '8px 12px 8px 40px',
                        fontSize: '14px',
                        border: '1px solid var(--chakra-colors-border-default)',
                        borderRadius: 'var(--chakra-radii-md)',
                        background: 'var(--chakra-colors-bg-default)',
                        color: 'var(--chakra-colors-fg-default)',
                        width: '100%',
                        cursor: isAdding ? 'not-allowed' : 'pointer',
                        appearance: 'none',
                        backgroundImage: 'none',
                      }}
                    >
                      <option value="auto">Mode Auto</option>
                      <option value="manual">Mode Manuel</option>
                    </select>
                    <Box
                      position="absolute"
                      left="12px"
                      top="50%"
                      transform="translateY(-50%)"
                      pointerEvents="none"
                      color="brand.600"
                    >
                      <Settings size={16} />
                    </Box>
                  </Box>
                </HStack>
                <Field.HelperText fontSize="xs" color="fg.muted" mt={1}>
                  {generationMode === 'auto' 
                    ? 'Les segments seront générés automatiquement' 
                    : 'Vous définirez les segments manuellement via un formulaire'}
                </Field.HelperText>
                {selectedFile && (
                  <Text fontSize="xs" color="fg.muted" mt={1}>
                    📁 Fichier sélectionné: {selectedFile.name}
                  </Text>
                )}
                {error && (
                  <Field.ErrorText whiteSpace="pre-wrap" fontSize="sm">
                    {error}
                  </Field.ErrorText>
                )}
              </Field.Root>
              
              <Text fontSize="xs" color="fg.muted">
                💡 Format attendu: NOMACTIF_YYYY-MM-DD.txt (ex: MC_2025-10-21.txt)
              </Text>
            </VStack>
          </form>
      </Card.Body>
    </Card.Root>
  );
}