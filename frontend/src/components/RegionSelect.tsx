import { UZBEKISTAN_REGIONS } from '@/constants/regions';
import { useTranslation } from '@/i18n';

interface RegionSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  includeAll?: boolean;
  required?: boolean;
  className?: string;
}

export function RegionSelect({
  value,
  onChange,
  placeholder = 'Select region',
  includeAll = false,
  required = false,
  className = '',
}: RegionSelectProps) {
  const { t, language } = useTranslation();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
    >
      {includeAll && <option value="all">{t('region.allRegions' as any)}</option>}
      {!includeAll && !value && <option value="">{placeholder || t('region.selectRegion' as any)}</option>}
      {UZBEKISTAN_REGIONS.map((r) => (
        <option key={r.id} value={r.id}>
          {language === 'ru' ? r.nameRu : language === 'uz' ? r.nameUz : r.name}
        </option>
      ))}
    </select>
  );
}
