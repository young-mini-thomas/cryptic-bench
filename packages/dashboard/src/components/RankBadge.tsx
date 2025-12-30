interface RankBadgeProps {
  rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
  const getBadgeStyle = () => {
    switch (rank) {
      case 1:
        return 'bg-yellow-400 text-yellow-900';
      case 2:
        return 'bg-gray-300 text-gray-800';
      case 3:
        return 'bg-orange-400 text-orange-900';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getEmoji = () => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${getBadgeStyle()}`}
    >
      {getEmoji() || `#${rank}`}
    </span>
  );
}
