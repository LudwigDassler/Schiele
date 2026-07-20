'use client';

import { useState } from 'react';

export default function MagicButton({ category }: { category: string }) {
  const [quote, setQuote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMagicClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/creative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category }),
      });
      
      const data = await response.json();
      if (data.quote) {
        setQuote(data.quote);
      }
    } catch (error) {
      console.error('Ошибка при вызове магии:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm w-full max-w-md">
      <button 
        onClick={handleMagicClick} 
        disabled={isLoading}
        className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {isLoading ? '✨ Колдуем...' : '✨ Добавить цитату'}
      </button>

      {quote && (
        <div className="mt-4 italic text-gray-700 border-l-4 border-gray-300 pl-4">
          «{quote}»
        </div>
      )}
    </div>
  );
}
