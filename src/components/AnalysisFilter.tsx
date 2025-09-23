/**
 * Client Component: Analysis Filter
 * ================================
 * 
 * Client-side filter for analysis results using URL search params
 */

'use client';

import { Filter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HStack, Box, Field } from "@chakra-ui/react";

interface AnalysisFilterProps {
  totalCount: number;
  rCount: number;
  vCount: number;
  unclassifiedCount: number;
}

export default function AnalysisFilter({ totalCount, rCount, vCount, unclassifiedCount }: AnalysisFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('filter') || 'all';

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams);
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <HStack gap={2}>
      <Filter size={16} color="var(--chakra-colors-gray-500)" />
      <Field.Root>
        <Field.Label srOnly>Filter by schema type</Field.Label>
        <Box
          as="select"
          value={currentFilter}
          onChange={(e: any) => handleFilterChange(e.target.value)}
          px={3}
          py={2}
          fontSize="sm"
          border="1px"
          borderColor="border.default"
          borderRadius="md"
          bg="bg.default"
          color="fg.default"
          minW="200px"
          _focus={{
            outline: "none",
            borderColor: "brand.500",
            boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)"
          }}
        >
          <option value="all">All ({totalCount})</option>
          <option value="R">R Schema ({rCount})</option>
          <option value="V">V Schema ({vCount})</option>
          <option value="UNCLASSIFIED">Unclassified ({unclassifiedCount})</option>
        </Box>
      </Field.Root>
    </HStack>
  );
}
