import { ThumbsDownIcon, ThumbsUpIcon } from '@/components/ui/icons';

export default function RecommendationIcon({ recommended }: { recommended: boolean }) {
  const Icon = recommended ? ThumbsUpIcon : ThumbsDownIcon;
  return <Icon size={16} strokeWidth="1.7" />;
}
