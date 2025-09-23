/**
 * Client Component: Add Stock Form
 * ================================
 * 
 * Client-side form for adding new stocks
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import dynamic from 'next/dynamic';

// Client-side only component to avoid hydration issues
const ClientOnlyInput = dynamic(() => Promise.resolve(({ value, onChange, placeholder, disabled, className, required }: any) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className={className}
    required={required}
  />
)), { ssr: false });

const ClientOnlyButton = dynamic(() => Promise.resolve(({ onClick, disabled, className, children }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={className}
  >
    {children}
  </button>
)), { ssr: false });

export default function AddStockForm() {
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    try {
      setIsAdding(true);
      const response = await fetch('/api/process-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: newSymbol.trim().toUpperCase() }),
      });

      if (response.ok) {
        setNewSymbol('');
        window.location.reload(); // Simple refresh to show new data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add stock');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Failed to add stock');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Stock</h2>
      <form onSubmit={handleAddStock} className="flex space-x-4">
        <ClientOnlyInput
          type="text"
          placeholder="Enter stock symbol (e.g., AAPL)"
          value={newSymbol}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSymbol(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <ClientOnlyButton
          type="submit"
          disabled={isAdding || !newSymbol.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? (
            <>
              <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Adding...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Stock
            </>
          )}
        </ClientOnlyButton>
      </form>
    </div>
  );
}