interface WeekSelectorProps {
  weeks: string[];
  selected: string;
  onChange: (weekId: string) => void;
}

export function WeekSelector({ weeks, selected, onChange }: WeekSelectorProps) {
  if (weeks.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="week-select" className="text-sm font-medium text-gray-700">
        Week:
      </label>
      <select
        id="week-select"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
      >
        {weeks.map((week) => (
          <option key={week} value={week}>
            {formatWeekId(week)}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatWeekId(weekId: string): string {
  // Convert '2025-W01' to 'Week 1, 2025'
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekId;

  const year = match[1];
  const week = parseInt(match[2], 10);

  return `Week ${week}, ${year}`;
}
