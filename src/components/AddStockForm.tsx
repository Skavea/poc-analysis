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
import { Plus, Database } from 'lucide-react';

export default function AddStockForm() {
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) {
      setError('Please enter a symbol');
      return;
    }

    try {
      setIsAdding(true);
      setError('');
      
      const response = await fetch('/api/process-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: newSymbol.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNewSymbol('');
        // Afficher un message de succès avec retours à la ligne
        alert(data.message || `${newSymbol.trim().toUpperCase()} a été ajouté avec succès !`);
        window.location.reload(); // Recharger pour afficher les nouvelles données
      } else {
        // Afficher le message d'erreur détaillé
        const errorMessage = data.message || data.error || 'Failed to add market';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      setError('Error adding market');
    } finally {
      setIsAdding(false);
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
                <Database size={24} />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontSize="lg" fontWeight="bold" color="fg.default">
                  Add New Market
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  Fetch and analyze data from Alpha Vantage
                </Text>
              </VStack>
            </HStack>
          </Card.Header>
      
      <Card.Body pt={0}>
        <form onSubmit={handleAddStock}>
          <VStack gap={4} align="stretch">
            <Field.Root invalid={!!error} suppressHydrationWarning={true}>
              <Field.Label fontSize="sm" color="fg.muted">
                Market Symbol
              </Field.Label>
              <HStack gap={3}>
                <Input
                  placeholder="Enter symbol (e.g., AAPL, HO.PA, BTC)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  disabled={isAdding}
                  size="md"
                  suppressHydrationWarning={true}
                />
                <Button
                  type="submit"
                  colorPalette="blue"
                  disabled={isAdding || !newSymbol.trim()}
                  minW="140px"
                  suppressHydrationWarning={true}
                >
                  {isAdding ? (
                    <>
                      <Spinner size="sm" mr={2} />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus size={16} style={{ marginRight: '8px' }} />
                      Add
                    </>
                  )}
                </Button>
              </HStack>
              {error && (
                <Field.ErrorText whiteSpace="pre-wrap" fontSize="sm">
                  {error}
                </Field.ErrorText>
              )}
            </Field.Root>
            
            <Text fontSize="xs" color="fg.muted">
              💡 Tip: Actions américaines (AAPL, GOOGL), françaises (HO.PA, MC.PA), crypto (BTC, ETH)
            </Text>
          </VStack>
        </form>
      </Card.Body>
    </Card.Root>
  );
}