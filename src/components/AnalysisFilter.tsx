/**
 * Client Component: Analysis Filter
 * ================================
 * 
 * Client-side filter for analysis results using URL search params
 */

'use client';

import { Filter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Client-side only component to avoid hydration issues
const ClientOnlySelect = dynamic(() => Promise.resolve(({ value, onChange, className, children }: any) => (
  <select
    value={value}
    onChange={onChange}
    className={className}
  >
    {children}
  </select>
)), { ssr: false });

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
    <div className="flex items-center space-x-2">
      <Filter className="h-4 w-4 text-gray-500" />
      <ClientOnlySelect
        value={currentFilter}
        onChange={(e: any) => handleFilterChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="all">All ({totalCount})</option>
        <option value="R">R Schema ({rCount})</option>
        <option value="V">V Schema ({vCount})</option>
        <option value="UNCLASSIFIED">Unclassified ({unclassifiedCount})</option>
      </ClientOnlySelect>
    </div>
  );
}
