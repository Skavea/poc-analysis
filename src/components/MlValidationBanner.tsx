/**
 * Client Component: ML Validation Banner
 * ======================================
 *
 * Permet de valider rapidement les segments classés par le ML (Yes/No)
 * afin de basculer ml_result vers TRUE ou FALSE et, si besoin, inverser le schema.
 */
'use client';

import { useState } from 'react';
import { Box, HStack, Text, Button, VStack, Stack } from '@chakra-ui/react';

interface MlValidationBannerProps {
  segmentId: string;
}

export default function MlValidationBanner({ segmentId }: MlValidationBannerProps) {
  const [selection, setSelection] = useState<'TRUE' | 'FALSE' | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!selection || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/update-classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId,
          mlValidation: selection,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to validate ML classification');
      }

      window.location.reload();
    } catch (err) {
      console.error('ML validation error:', err);
      setError('Impossible de mettre à jour la validation ML');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      bg="orange.500"
      color="white"
      py={4}
      px={5}
      borderRadius="md"
    >
      <VStack align="stretch" gap={3}>
        <Text fontWeight="semibold">
          Ce segment a été classé automatiquement. Confirmez-vous le résultat ?
        </Text>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
          <HStack gap={2}>
            <input
              type="radio"
              id="ml-banner-yes"
              name="ml-banner"
              value="TRUE"
              checked={selection === 'TRUE'}
              onChange={() => setSelection('TRUE')}
            />
            <label htmlFor="ml-banner-yes">
              Yes (validation ML)
            </label>
          </HStack>
          <HStack gap={2}>
            <input
              type="radio"
              id="ml-banner-no"
              name="ml-banner"
              value="FALSE"
              checked={selection === 'FALSE'}
              onChange={() => setSelection('FALSE')}
            />
            <label htmlFor="ml-banner-no">
              No (inverser R/V)
            </label>
          </HStack>
        </Stack>
        {error && (
          <Text fontSize="sm" color="whiteAlpha.900">
            {error}
          </Text>
        )}
        <HStack>
          <Button
            onClick={handleSave}
            disabled={!selection || saving}
            size="sm"
            colorPalette="gray"
            bg="white"
            color="orange.600"
            _hover={{ bg: 'whiteAlpha.900' }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}

