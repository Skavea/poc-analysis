/**
 * Client Component: Schema Update Form
 * ===================================
 * 
 * Client-side form for updating segment classification
 */

'use client';

import { useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Spinner, 
  Badge,
  Field,
} from "@chakra-ui/react";

interface SchemaUpdateFormProps {
  segmentId: string;
  initialSchemaType: string;
}

export default function SchemaUpdateForm({ segmentId, initialSchemaType }: SchemaUpdateFormProps) {
  const [schemaType, setSchemaType] = useState<'R' | 'V' | 'UNCLASSIFIED'>(initialSchemaType as 'R' | 'V' | 'UNCLASSIFIED');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateSchema = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch('/api/update-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          segmentId, 
          schemaType 
        }),
      });

      if (response.ok) {
        window.location.reload(); // Simple refresh to show updated data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update schema');
      }
    } catch (error) {
      console.error('Error updating schema:', error);
      alert('Failed to update schema');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReset = () => {
    setSchemaType('UNCLASSIFIED');
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleUpdateSchema(); }}>
      <VStack gap={4} align="stretch">
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
    </form>
  );
}