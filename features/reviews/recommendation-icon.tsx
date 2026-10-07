import { ThumbsDownIcon, ThumbsUpIcon } from '@/components/ui/icons';

export default function RecommendationIcon({
  recommended,
  size = 16,
}: {
  recommended: boolean;
  size?: number;
}) {
  const Icon = recommended ? ThumbsUpIcon : ThumbsDownIcon;
  return <Icon size={size} strokeWidth="1.7" />;
}
