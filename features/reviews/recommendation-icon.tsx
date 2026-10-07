import { ThumbsDownIcon, ThumbsUpIcon } from '@/components/ui/icons';

export default function RecommendationIcon({
  recommended,
  size = 16,
  filled = false,
}: {
  recommended: boolean;
  size?: number;
  filled?: boolean;
}) {
  const Icon = recommended ? ThumbsUpIcon : ThumbsDownIcon;
  return <Icon size={size} strokeWidth="1.7" fill={filled ? 'currentColor' : 'none'} />;
}
