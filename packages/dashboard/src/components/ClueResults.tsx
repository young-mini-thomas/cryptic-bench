import { useEffect, useState } from 'react';
import { getModelClueResults } from '../db/queries';
import type { ClueResult } from '../types';

interface ClueResultsProps {
  modelId: number;
  weekId: string;
}

export function ClueResults({ modelId, weekId }: ClueResultsProps) {
  const [results, setResults] = useState<ClueResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      const data = getModelClueResults(modelId, weekId);
      setResults(data);
    } catch (error) {
      console.error('Failed to load clue results:', error);
    }
    setLoading(false);
  }, [modelId, weekId]);

  if (loading) {
    return <div className="py-4 text-gray-500">Loading clue results...</div>;
  }

  if (results.length === 0) {
    return <div className="py-4 text-gray-500">No results available.</div>;
  }

  const correctCount = results.filter((r) => r.isCorrect).length;
  const incorrectCount = results.length - correctCount;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex space-x-4 mb-4 text-sm">
        <span className="text-green-600 font-medium">
          {correctCount} correct
        </span>
        <span className="text-red-600 font-medium">
          {incorrectCount} incorrect
        </span>
      </div>

      <div className="space-y-3">
        {results.map((result) => (
          <div
            key={result.clueId}
            className={`
              bg-white rounded p-3 border-l-4
              ${result.isCorrect ? 'border-l-green-400' : 'border-l-red-400'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-gray-800">
                  "{result.clueText}" <span className="text-gray-500">{result.letterCount}</span>
                </p>
                {result.setter && (
                  <p className="text-xs text-gray-400 mt-1">by {result.setter}</p>
                )}
              </div>
              <span
                className={`
                  ml-4 text-xl
                  ${result.isCorrect ? 'text-green-500' : 'text-red-500'}
                `}
              >
                {result.isCorrect ? '✓' : '✗'}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Correct: </span>
                <span className="font-mono font-medium text-green-700">{result.answer}</span>
              </div>
              <div>
                <span className="text-gray-500">Model: </span>
                <span
                  className={`font-mono font-medium ${
                    result.isCorrect ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {result.extractedAnswer || '(no answer)'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
