import { useEffect, useState } from 'react';
import { initDatabase, isInitialized } from './db/sqlite-client';
import { getAvailableWeeks, getWeeklyLeaderboard, getWeekSummary } from './db/queries';
import { Header } from './components/Header';
import { Leaderboard } from './components/Leaderboard';
import { WeekSelector } from './components/WeekSelector';
import type { WeeklyRanking, WeekSummary as WeekSummaryType } from './types';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [rankings, setRankings] = useState<WeeklyRanking[]>([]);
  const [summary, setSummary] = useState<WeekSummaryType | null>(null);

  // Initialize database
  useEffect(() => {
    initDatabase()
      .then(() => {
        const availableWeeks = getAvailableWeeks();
        setWeeks(availableWeeks);

        if (availableWeeks.length > 0) {
          setSelectedWeek(availableWeeks[0]);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        setError('Failed to load benchmark data. Please try again later.');
        setLoading(false);
      });
  }, []);

  // Load data when week changes
  useEffect(() => {
    if (!selectedWeek || !isInitialized()) return;

    try {
      const weekRankings = getWeeklyLeaderboard(selectedWeek);
      setRankings(weekRankings);

      const weekSummary = getWeekSummary(selectedWeek);
      setSummary(weekSummary);
    } catch (err) {
      console.error('Failed to load week data:', err);
    }
  }, [selectedWeek]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading benchmark data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700">No Data Yet</h2>
            <p className="mt-2 text-gray-500">
              The benchmark hasn't run yet. Check back after the first weekly evaluation.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Leaderboard</h2>
            {summary && (
              <p className="text-sm text-gray-500">
                {summary.clueCount} clues from {summary.puzzleCount} puzzle
                {summary.puzzleCount !== 1 ? 's' : ''} • {summary.modelCount} models evaluated
              </p>
            )}
          </div>

          <WeekSelector weeks={weeks} selected={selectedWeek} onChange={setSelectedWeek} />
        </div>

        <Leaderboard rankings={rankings} weekId={selectedWeek} />

        <footer className="mt-12 text-center text-sm text-gray-400">
          <p>
            Puzzles sourced from{' '}
            <a
              href="https://www.theguardian.com/crosswords"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              The Guardian
            </a>
            . Models evaluated via{' '}
            <a
              href="https://openrouter.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              OpenRouter
            </a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
