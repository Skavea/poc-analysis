/**
 * Client Component: Advanced Analysis Filter
 * ==========================================
 * 
 * Filtre avancé avec dropdowns pour Schema type et Pattern
 * Permet de filtrer par plusieurs critères simultanément
 */

'use client';

import { Filter, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { 
  HStack, 
  Field, 
  Box, 
  VStack, 
  Text
} from "@chakra-ui/react";

interface AdvancedAnalysisFilterProps {
  totalCount: number;
  rCount: number;
  vCount: number;
  unclassifiedCount: number;
  patternYesCount: number;
  patternNoCount: number;
  patternUnclassifiedCount: number;
}

export default function AdvancedAnalysisFilter({ 
  totalCount, 
  rCount, 
  vCount, 
  unclassifiedCount,
  patternYesCount,
  patternNoCount,
  patternUnclassifiedCount
}: AdvancedAnalysisFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // États pour les filtres
  const [schemaFilters, setSchemaFilters] = useState<Set<string>>(
    new Set(searchParams.getAll('schema'))
  );
  const [patternFilters, setPatternFilters] = useState<Set<string>>(
    new Set(searchParams.getAll('pattern'))
  );
  
  // États pour les dropdowns
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);
  const [isPatternOpen, setIsPatternOpen] = useState(false);

  // Fonction pour mettre à jour les paramètres URL
  const updateUrlParams = (newSchemaFilters: Set<string>, newPatternFilters: Set<string>) => {
    const params = new URLSearchParams();
    
    // Ajouter les filtres schema
    newSchemaFilters.forEach(filter => {
      params.append('schema', filter);
    });
    
    // Ajouter les filtres pattern
    newPatternFilters.forEach(filter => {
      params.append('pattern', filter);
    });
    
    router.push(`?${params.toString()}`);
  };

  // Gestion des filtres schema
  const handleSchemaFilterChange = (filter: string, checked: boolean) => {
    const newFilters = new Set(schemaFilters);
    if (checked) {
      newFilters.add(filter);
    } else {
      newFilters.delete(filter);
    }
    setSchemaFilters(newFilters);
    updateUrlParams(newFilters, patternFilters);
  };

  // Gestion des filtres pattern
  const handlePatternFilterChange = (filter: string, checked: boolean) => {
    const newFilters = new Set(patternFilters);
    if (checked) {
      newFilters.add(filter);
    } else {
      newFilters.delete(filter);
    }
    setPatternFilters(newFilters);
    updateUrlParams(schemaFilters, newFilters);
  };

  // Fonction pour obtenir le nombre total d'éléments filtrés
  const getFilteredCount = () => {
    // Si aucun filtre n'est sélectionné, retourner le total
    if (schemaFilters.size === 0 && patternFilters.size === 0) {
      return totalCount;
    }
    
    // Pour simplifier, on retourne le total pour l'instant
    // Dans une vraie implémentation, on calculerait le nombre exact
    return totalCount;
  };

  return (
    <VStack gap={4} align="stretch">
      <HStack gap={4} align="center" justify="space-between">
        <HStack gap={2} align="center">
          <Filter size={16} color="var(--chakra-colors-gray-500)" />
          <Text fontSize="sm" fontWeight="medium">Active filters</Text>
        </HStack>
        <Text fontSize="sm" color="fg.muted">
          Filtered results: {getFilteredCount()}
        </Text>
      </HStack>
      
      {/* Dropdown Schema Type */}
      <Box>
        <button
          onClick={() => setIsSchemaOpen(!isSchemaOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid var(--chakra-colors-border-default)',
            borderRadius: '6px',
            background: 'var(--chakra-colors-bg-default)',
            color: 'var(--chakra-colors-fg-default)',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'var(--chakra-colors-bg-muted)'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'var(--chakra-colors-bg-default)'}
        >
          <Text fontSize="sm" fontWeight="medium">Schema type</Text>
          <ChevronDown size={16} style={{ transform: isSchemaOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </button>
        
        {isSchemaOpen && (
          <Box
            marginTop="4px"
            padding="12px"
            border="1px solid"
            borderColor="border.default"
            borderRadius="md"
            background="bg.default"
            boxShadow="lg"
          >
            <VStack gap={2} align="stretch">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={schemaFilters.has('R')}
                  onChange={(e) => handleSchemaFilterChange('R', e.target.checked)}
                  style={{ margin: 0 }}
                />
                <Text fontSize="sm">R ({rCount})</Text>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={schemaFilters.has('V')}
                  onChange={(e) => handleSchemaFilterChange('V', e.target.checked)}
                  style={{ margin: 0 }}
                />
                <Text fontSize="sm">V ({vCount})</Text>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={schemaFilters.has('UNCLASSIFIED')}
                  onChange={(e) => handleSchemaFilterChange('UNCLASSIFIED', e.target.checked)}
                  style={{ margin: 0 }}
                />
                <Text fontSize="sm">UNCLASSIFIED ({unclassifiedCount})</Text>
              </label>
            </VStack>
          </Box>
        )}
      </Box>

      {/* Dropdown Pattern */}
      <Box>
        <button
          onClick={() => setIsPatternOpen(!isPatternOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid var(--chakra-colors-border-default)',
            borderRadius: '6px',
            background: 'var(--chakra-colors-bg-default)',
            color: 'var(--chakra-colors-fg-default)',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'var(--chakra-colors-bg-muted)'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'var(--chakra-colors-bg-default)'}
        >
          <Text fontSize="sm" fontWeight="medium">Pattern</Text>
          <ChevronDown size={16} style={{ transform: isPatternOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </button>
        
        {isPatternOpen && (
          <Box
            marginTop="4px"
            padding="12px"
            border="1px solid"
            borderColor="border.default"
            borderRadius="md"
            background="bg.default"
            boxShadow="lg"
          >
            <VStack gap={2} align="stretch">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={patternFilters.has('yes')}
                  onChange={(e) => handlePatternFilterChange('yes', e.target.checked)}
                  style={{ margin: 0 }}
                />
                <Text fontSize="sm">Yes ({patternYesCount})</Text>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={patternFilters.has('no')}
                  onChange={(e) => handlePatternFilterChange('no', e.target.checked)}
                  style={{ margin: 0 }}
                />
                <Text fontSize="sm">No ({patternNoCount})</Text>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={patternFilters.has('unclassified')}
                  onChange={(e) => handlePatternFilterChange('unclassified', e.target.checked)}
                  style={{ margin: 0 }}
                />
                <Text fontSize="sm">UNCLASSIFIED ({patternUnclassifiedCount})</Text>
              </label>
            </VStack>
          </Box>
        )}
      </Box>

    </VStack>
  );
}
