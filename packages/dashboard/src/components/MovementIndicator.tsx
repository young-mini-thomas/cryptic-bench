interface MovementIndicatorProps {
  change: number | null;
}

export function MovementIndicator({ change }: MovementIndicatorProps) {
  if (change === null) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
        NEW
      </span>
    );
  }

  if (change === 0) {
    return (
      <span className="inline-flex items-center text-gray-400">
        <span className="text-lg">—</span>
      </span>
    );
  }

  if (change > 0) {
    return (
      <span className="inline-flex items-center text-green-600">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">{change}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center text-red-600">
      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      <span className="font-medium">{Math.abs(change)}</span>
    </span>
  );
}
