import { REGION_COLORS, getRegionName, type RegionId } from '@/constants/regions';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface RegionBadgeProps {
  regionId: string | null | undefined;
  className?: string;
}

export function RegionBadge({ regionId, className }: RegionBadgeProps) {
  const { language } = useTranslation();
  if (!regionId) return <span className="text-muted-foreground text-xs">—</span>;

  const colorClass = REGION_COLORS[regionId as RegionId] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colorClass, className)}>
      {getRegionName(regionId, language)}
    </span>
  );
}
