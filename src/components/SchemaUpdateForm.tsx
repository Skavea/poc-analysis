/**
 * Client Component: Schema Update Form
 * ===================================
 * 
 * Client-side form for updating segment classification
 */

'use client';

import { useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import dynamic from 'next/dynamic';

// Client-side only component to avoid hydration issues
const ClientOnlyButton = dynamic(() => Promise.resolve(({ onClick, disabled, className, children }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={className}
  >
    {children}
  </button>
)), { ssr: false });

const ClientOnlyRadioGroup = dynamic(() => Promise.resolve(({ value, onChange, children }: any) => (
  <div className="space-y-2">
    {children}
  </div>
)), { ssr: false });

interface SchemaUpdateFormProps {
  segmentId: string;
  initialSchemaType: string;
}

export default function SchemaUpdateForm({ segmentId, initialSchemaType }: SchemaUpdateFormProps) {
  const [schemaType, setSchemaType] = useState<'R' | 'V' | 'UNCLASSIFIED'>(initialSchemaType as any);
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
    <form onSubmit={(e) => { e.preventDefault(); handleUpdateSchema(); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Classification Schema
        </label>
        <ClientOnlyRadioGroup value={schemaType} onChange={(e) => setSchemaType(e.target.value as any)}>
          <label className="flex items-center">
            <input
              type="radio"
              name="schemaType"
              value="R"
              checked={schemaType === 'R'}
              onChange={(e) => setSchemaType(e.target.value as 'R')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                R
              </span>
              Reversal Pattern
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="radio"
              name="schemaType"
              value="V"
              checked={schemaType === 'V'}
              onChange={(e) => setSchemaType(e.target.value as 'V')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                V
              </span>
              Volatility Pattern
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="radio"
              name="schemaType"
              value="UNCLASSIFIED"
              checked={schemaType === 'UNCLASSIFIED'}
              onChange={(e) => setSchemaType(e.target.value as 'UNCLASSIFIED')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                UNCLASSIFIED
              </span>
              Not Classified
            </span>
          </label>
        </ClientOnlyRadioGroup>
      </div>

      <div className="flex space-x-3">
        <ClientOnlyButton
          type="submit"
          disabled={isUpdating}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUpdating ? (
            <>
              <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Updating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Update Classification
            </>
          )}
        </ClientOnlyButton>

        <ClientOnlyButton
          type="button"
          onClick={handleReset}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </ClientOnlyButton>
      </div>
    </form>
  );
}