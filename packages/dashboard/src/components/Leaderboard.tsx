import { useState } from 'react';
import type { WeeklyRanking } from '../types';
import { RankBadge } from './RankBadge';
import { MovementIndicator } from './MovementIndicator';
import { TenureDisplay } from './TenureDisplay';
import { ProviderBadge } from './ProviderBadge';
import { ClueResults } from './ClueResults';

interface LeaderboardProps {
  rankings: WeeklyRanking[];
  weekId: string;
}

export function Leaderboard({ rankings, weekId }: LeaderboardProps) {
  const [expandedModelId, setExpandedModelId] = useState<number | null>(null);

  if (rankings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No rankings available for this week.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rankings.map((ranking) => (
        <div key={ranking.modelId}>
          <div
            className={`
              bg-white rounded-lg shadow-sm border-l-4 p-4 cursor-pointer
              hover:shadow-md transition-shadow
              ${ranking.rank === 1 ? 'border-l-yellow-400' : ''}
              ${ranking.rank === 2 ? 'border-l-gray-400' : ''}
              ${ranking.rank === 3 ? 'border-l-orange-400' : ''}
              ${ranking.rank > 3 ? 'border-l-gray-200' : ''}
            `}
            onClick={() =>
              setExpandedModelId(expandedModelId === ranking.modelId ? null : ranking.modelId)
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <RankBadge rank={ranking.rank} />

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-lg">{ranking.displayName}</span>
                    <ProviderBadge provider={ranking.provider} />
                  </div>
                  <TenureDisplay weeks={ranking.tenureWeeks} rank={ranking.rank} />
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {ranking.accuracy.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    {ranking.correctCount}/{ranking.totalClues} correct
                  </div>
                </div>

                <div className="w-16 text-center">
                  <MovementIndicator change={ranking.rankChange} />
                </div>

                <div className="text-gray-400">
                  <svg
                    className={`w-5 h-5 transform transition-transform ${
                      expandedModelId === ranking.modelId ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {expandedModelId === ranking.modelId && (
            <div className="mt-2 ml-14">
              <ClueResults modelId={ranking.modelId} weekId={weekId} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
