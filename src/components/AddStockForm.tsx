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
      setError('Please enter a stock symbol');
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

      if (response.ok) {
        setNewSymbol('');
        // Simple success feedback
        alert(`${newSymbol.trim().toUpperCase()} has been added successfully!`);
        window.location.reload(); // Simple refresh to show new data
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add stock');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      setError('Failed to add stock');
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
                  Add New Stock
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  Fetch and analyze stock data from Alpha Vantage
                </Text>
              </VStack>
            </HStack>
          </Card.Header>
      
      <Card.Body pt={0}>
        <form onSubmit={handleAddStock}>
          <VStack gap={4} align="stretch">
            <Field.Root invalid={!!error} suppressHydrationWarning={true}>
              <Field.Label fontSize="sm" color="fg.muted">
                Stock Symbol
              </Field.Label>
              <HStack gap={3}>
                <Input
                  placeholder="Enter stock symbol (e.g., AAPL)"
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
                      Add Stock
                    </>
                  )}
                </Button>
              </HStack>
              {error && (
                <Field.ErrorText>{error}</Field.ErrorText>
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