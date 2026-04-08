export type RegionId =
  | 'andijan'
  | 'bukhara'
  | 'fergana'
  | 'jizzakh'
  | 'kashkadarya'
  | 'khorezm'
  | 'namangan'
  | 'navoi'
  | 'samarkand'
  | 'sirdaryo'
  | 'surkhandarya'
  | 'tashkent';

export interface Region {
  id: RegionId;
  name: string;
  nameRu: string;
  nameUz: string;
}

export const UZBEKISTAN_REGIONS: Region[] = [
  { id: 'andijan', name: 'Andijan', nameRu: 'Андижан', nameUz: 'Andijon' },
  { id: 'bukhara', name: 'Bukhara', nameRu: 'Бухара', nameUz: 'Buxoro' },
  { id: 'fergana', name: 'Fergana', nameRu: 'Фергана', nameUz: 'Farg\'ona' },
  { id: 'jizzakh', name: 'Jizzakh', nameRu: 'Джизак', nameUz: 'Jizzax' },
  { id: 'kashkadarya', name: 'Kashkadarya', nameRu: 'Кашкадарья', nameUz: 'Qashqadaryo' },
  { id: 'khorezm', name: 'Khorezm', nameRu: 'Хорезм', nameUz: 'Xorazm' },
  { id: 'namangan', name: 'Namangan', nameRu: 'Наманган', nameUz: 'Namangan' },
  { id: 'navoi', name: 'Navoi', nameRu: 'Навои', nameUz: 'Navoiy' },
  { id: 'samarkand', name: 'Samarkand', nameRu: 'Самарканд', nameUz: 'Samarqand' },
  { id: 'sirdaryo', name: 'Sirdaryo', nameRu: 'Сырдарья', nameUz: 'Sirdaryo' },
  { id: 'surkhandarya', name: 'Surkhandarya', nameRu: 'Сурхандарья', nameUz: 'Surxondaryo' },
  { id: 'tashkent', name: 'Tashkent', nameRu: 'Ташкент', nameUz: 'Toshkent' },
];

export const REGION_COLORS: Record<RegionId, string> = {
  andijan: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  bukhara: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  fergana: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  jizzakh: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  kashkadarya: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  khorezm: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  namangan: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  navoi: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  samarkand: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  sirdaryo: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  surkhandarya: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  tashkent: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

export function getRegionName(regionId: string | null | undefined, language?: string): string {
  if (!regionId) return '—';
  const region = UZBEKISTAN_REGIONS.find((r) => r.id === regionId);
  if (!region) return regionId;
  if (language === 'ru') return region.nameRu;
  if (language === 'uz') return region.nameUz;
  return region.name;
}

/** Translate an English region name (from backend) to the current language */
export function localizeRegionName(englishName: string | null | undefined, language?: string): string {
  if (!englishName) return '—';
  const region = UZBEKISTAN_REGIONS.find((r) => r.name.toLowerCase() === englishName.toLowerCase());
  if (!region) return englishName;
  if (language === 'ru') return region.nameRu;
  if (language === 'uz') return region.nameUz;
  return region.name;
}
