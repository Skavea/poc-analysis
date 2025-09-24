/**
 * Client Component: Analysis Filter
 * ================================
 * 
 * Client-side filter for analysis results using URL search params
 */

'use client';

import { Filter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HStack, Field } from "@chakra-ui/react";

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
        <select
          value={currentFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: 'small',
            border: '1px solid var(--chakra-colors-border-default)',
            borderRadius: 'var(--chakra-radii-md)',
            background: 'var(--chakra-colors-bg-default)',
            color: 'var(--chakra-colors-fg-default)',
            minWidth: '200px',
          }}
        >
          <option value="all">All ({totalCount})</option>
          <option value="R">R Schema ({rCount})</option>
          <option value="V">V Schema ({vCount})</option>
          <option value="UNCLASSIFIED">Unclassified ({unclassifiedCount})</option>
        </select>
      </Field.Root>
    </HStack>
  );
}
