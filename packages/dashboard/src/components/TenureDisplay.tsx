interface TenureDisplayProps {
  weeks: number | null;
  rank: number;
}

export function TenureDisplay({ weeks, rank }: TenureDisplayProps) {
  if (!weeks || weeks < 1) return null;

  const getCrownEmoji = () => {
    if (rank === 1 && weeks >= 3) return '👑';
    return null;
  };

  return (
    <span className="inline-flex items-center text-sm text-gray-500">
      {getCrownEmoji()}
      <span className="ml-1">
        {weeks} week{weeks !== 1 ? 's' : ''} at #{rank}
      </span>
    </span>
  );
}
