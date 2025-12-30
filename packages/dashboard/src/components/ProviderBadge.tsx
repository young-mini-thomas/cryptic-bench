interface ProviderBadgeProps {
  provider: string;
}

const providerColors: Record<string, string> = {
  anthropic: 'bg-orange-100 text-orange-800',
  openai: 'bg-green-100 text-green-800',
  google: 'bg-blue-100 text-blue-800',
  xai: 'bg-purple-100 text-purple-800',
  deepseek: 'bg-cyan-100 text-cyan-800',
  qwen: 'bg-indigo-100 text-indigo-800',
};

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  const colorClass = providerColors[provider.toLowerCase()] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {provider}
    </span>
  );
}
