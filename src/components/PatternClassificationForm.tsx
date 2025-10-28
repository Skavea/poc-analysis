/**
 * Client Component: Pattern Classification Form
 * =============================================
 * 
 * Form for classifying patterns and selecting specific points
 */

'use client';

import { useState, useCallback } from 'react';
import { Save, RotateCcw, Target } from 'lucide-react';
import { 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Spinner, 
  Badge,
  Field,
  Box,
} from "@chakra-ui/react";
import PointSelectionModal from './PointSelectionModal';

interface PatternClassificationFormProps {
  segmentId: string;
  initialSchemaType: string;
  initialPatternPoint?: string | null;
  pointsData: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  onPointSelect?: (timestamp: string) => void;
}

export default function PatternClassificationForm({ 
  segmentId, 
  initialSchemaType, 
  initialPatternPoint,
  pointsData,
  onPointSelect
}: PatternClassificationFormProps) {
  const [schemaType, setSchemaType] = useState<'R' | 'V' | 'UNCLASSIFIED'>(initialSchemaType as 'R' | 'V' | 'UNCLASSIFIED');
  const [hasPattern, setHasPattern] = useState<'yes' | 'no' | 'unclassified'>(
    initialPatternPoint === null || initialPatternPoint === '' || initialPatternPoint === 'null' ? 'no' :
    initialPatternPoint === 'UNCLASSIFIED' || initialPatternPoint === 'unclassified' ? 'unclassified' :
    initialPatternPoint ? 'yes' : 'unclassified'
  );
  const [selectedPoint, setSelectedPoint] = useState<string | null>(
    initialPatternPoint && 
    initialPatternPoint !== 'UNCLASSIFIED' && 
    initialPatternPoint !== 'unclassified' && 
    initialPatternPoint !== 'null' && 
    initialPatternPoint !== '' 
      ? initialPatternPoint 
      : null
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fonction pour gérer la sélection d'un point
  const handlePointSelection = useCallback((timestamp: string) => {
    setSelectedPoint(timestamp);
    setIsModalOpen(false);
    if (onPointSelect) {
      onPointSelect(timestamp);
    }
  }, [onPointSelect]);

  // Fonction pour formater l'heure du point sélectionné
  // Formate l'heure en format français sans appliquer le décalage horaire
  // Utilise directement les valeurs UTC de la date pour éviter le changement d'heure
  const formatSelectedPointTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Fonction pour trouver les données du point sélectionné
  const getSelectedPointData = (timestamp: string) => {
    return pointsData.find(point => point.timestamp === timestamp);
  };

  const handleUpdateClassification = async () => {
    try {
      setIsUpdating(true);
      
      // Déterminer la valeur finale du pattern point
      let finalPatternPoint: string | null = null;
      if (hasPattern === 'yes' && selectedPoint) {
        finalPatternPoint = selectedPoint;
      } else if (hasPattern === 'no') {
        finalPatternPoint = null;
      } else if (hasPattern === 'unclassified') {
        // Pour unclassified, on ne met rien (null) - sera géré par le backend
        finalPatternPoint = null;
      }

      const response = await fetch('/api/update-classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          segmentId, 
          schemaType,
          patternPoint: finalPatternPoint
        }),
      });

      if (response.ok) {
        window.location.reload(); // Simple refresh to show updated data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update classification');
      }
    } catch (error) {
      console.error('Error updating classification:', error);
      alert('Failed to update classification');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReset = () => {
    setSchemaType('UNCLASSIFIED');
    setHasPattern('unclassified');
    setSelectedPoint(null);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleUpdateClassification(); }}>
      <VStack gap={4} align="stretch">
        
        {/* Section Classification Patterns */}
        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="medium" color="fg.muted" mb={2}>
            Classification Patterns
          </Field.Label>
          <VStack gap={3} align="stretch">
            <HStack gap={2}>
              <input 
                type="radio" 
                id="pattern-yes" 
                name="pattern" 
                value="yes" 
                checked={hasPattern === 'yes'}
                onChange={(e) => setHasPattern('yes')}
              />
              <label htmlFor="pattern-yes">
                <HStack gap={2}>
                  <Badge colorPalette="green" variant="subtle" size="sm">Yes</Badge>
                  <Text fontSize="sm" color="fg.default">Pattern detected</Text>
                </HStack>
              </label>
            </HStack>
            
            <HStack gap={2}>
              <input 
                type="radio" 
                id="pattern-no" 
                name="pattern" 
                value="no" 
                checked={hasPattern === 'no'}
                onChange={(e) => setHasPattern('no')}
              />
              <label htmlFor="pattern-no">
                <HStack gap={2}>
                  <Badge colorPalette="red" variant="subtle" size="sm">No</Badge>
                  <Text fontSize="sm" color="fg.default">No pattern</Text>
                </HStack>
              </label>
            </HStack>
            
            <HStack gap={2}>
              <input 
                type="radio" 
                id="pattern-unclassified" 
                name="pattern" 
                value="unclassified" 
                checked={hasPattern === 'unclassified'}
                onChange={(e) => setHasPattern('unclassified')}
              />
              <label htmlFor="pattern-unclassified">
                <HStack gap={2}>
                  <Badge colorPalette="gray" variant="subtle" size="sm">UNCLASSIFIED</Badge>
                  <Text fontSize="sm" color="fg.default">Not yet analyzed</Text>
                </HStack>
              </label>
            </HStack>
          </VStack>
        </Field.Root>

        {/* Bouton de sélection de point - visible seulement si "Yes" est sélectionné */}
        {hasPattern === 'yes' && (
          <HStack gap={3} align="center">
            <Button
              type="button"
              onClick={() => setIsModalOpen(true)}
              variant="outline"
              size="sm"
              colorPalette="blue"
            >
              <Target size={16} style={{ marginRight: '8px' }} />
              Select a point
            </Button>
            {selectedPoint && (
              <Text fontSize="sm" color="#eab308" fontWeight="semibold">
                {formatSelectedPointTime(selectedPoint)}
              </Text>
            )}
          </HStack>
        )}

        {/* Section Classification Schema - Affichage conditionnel */}
        {(hasPattern === 'no' || (hasPattern === 'yes' && selectedPoint)) && (
          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="medium" color="fg.muted" mb={2}>
              Classification Schema
            </Field.Label>
            <VStack gap={3} align="stretch">
              <HStack gap={2}>
                <input 
                  type="radio" 
                  id="schema-r" 
                  name="schema" 
                  value="R" 
                  checked={schemaType === 'R'}
                  onChange={(e) => setSchemaType(e.target.value as 'R' | 'V' | 'UNCLASSIFIED')}
                />
                <label htmlFor="schema-r">
                  <HStack gap={2}>
                    <Badge colorPalette="blue" variant="subtle" size="sm">R</Badge>
                    <Text fontSize="sm" color="fg.default">Reversal Pattern</Text>
                  </HStack>
                </label>
              </HStack>
              
              <HStack gap={2}>
                <input 
                  type="radio" 
                  id="schema-v" 
                  name="schema" 
                  value="V" 
                  checked={schemaType === 'V'}
                  onChange={(e) => setSchemaType(e.target.value as 'R' | 'V' | 'UNCLASSIFIED')}
                />
                <label htmlFor="schema-v">
                  <HStack gap={2}>
                    <Badge colorPalette="green" variant="subtle" size="sm">V</Badge>
                    <Text fontSize="sm" color="fg.default">Volatility Pattern</Text>
                  </HStack>
                </label>
              </HStack>
              
              <HStack gap={2}>
                <input 
                  type="radio" 
                  id="schema-unclassified" 
                  name="schema" 
                  value="UNCLASSIFIED" 
                  checked={schemaType === 'UNCLASSIFIED'}
                  onChange={(e) => setSchemaType(e.target.value as 'R' | 'V' | 'UNCLASSIFIED')}
                />
                <label htmlFor="schema-unclassified">
                  <HStack gap={2}>
                    <Badge colorPalette="gray" variant="subtle" size="sm">UNCLASSIFIED</Badge>
                    <Text fontSize="sm" color="fg.default">Not Classified</Text>
                  </HStack>
                </label>
              </HStack>
            </VStack>
          </Field.Root>
        )}

        <HStack gap={3}>
          <Button
            type="submit"
            disabled={isUpdating}
            colorPalette="blue"
            size="sm"
          >
            {isUpdating ? (
              <>
                <Spinner size="sm" mr={2} />
                Updating...
              </>
            ) : (
              <>
                <Save size={16} style={{ marginRight: '8px' }} />
                Update Classification
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleReset}
            variant="outline"
            size="sm"
          >
            <RotateCcw size={16} style={{ marginRight: '8px' }} />
            Reset
          </Button>
        </HStack>
      </VStack>

      {/* Modal de sélection de point */}
      <PointSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPointSelect={handlePointSelection}
        pointsData={pointsData}
        analysis={{
          x0: '0', // Pas utilisé dans la modal
          minPrice: Math.min(...pointsData.map(p => p.close)).toString(),
          maxPrice: Math.max(...pointsData.map(p => p.close)).toString(),
          averagePrice: (pointsData.reduce((sum, p) => sum + p.close, 0) / pointsData.length).toString()
        }}
      />
    </form>
  );
}
