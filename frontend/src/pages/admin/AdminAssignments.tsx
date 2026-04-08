import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RegionBadge } from '@/components/RegionBadge';
import { RegionSelect } from '@/components/RegionSelect';
import { getRegionName } from '@/constants/regions';
import {
  Search, Users, Store as StoreIcon, Link as LinkIcon, Unlink, UserPlus,
  CalendarDays, ArrowRight, MapPin, ChevronRight, Plus, Check, X
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { Store, User } from '@/types';

/* ── Tab 1 — Employee → Store Assignments ──────────────────── */
function EmployeeAssignmentsTab() {
  const { t, language, dateLocale } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assignRegion, setAssignRegion] = useState('all');
  const [assignSearch, setAssignSearch] = useState('');
  const [dueDates, setDueDates] = useState<Record<string, string>>({});

  const { data: employees } = useQuery({
    queryKey: ['allUsers', 1, 200, 'Employee', '', assignRegion],
    queryFn: () => api.getAllUsers(1, 200, 'Employee', undefined, assignRegion !== 'all' ? assignRegion : undefined),
  });

  const { data: stores } = useQuery({
    queryKey: ['allStoresAssign', 1, 200, '', assignRegion],
    queryFn: () => api.getAllStores(1, 200, undefined, assignRegion !== 'all' ? assignRegion : undefined),
  });

  const selectedEmployeeId = searchParams.get('employeeId');
  const selectedEmployee = employees?.items.find(e => e.id === selectedEmployeeId) ?? null;

  const setSelectedEmployee = (emp: User | null) => {
    setSearchParams(prev => {
      if (emp) { prev.set('employeeId', emp.id); } else { prev.delete('employeeId'); }
      return prev;
    });
  };

  const { data: assignedStores } = useQuery({
    queryKey: ['userStores', selectedEmployee?.id],
    queryFn: () => api.getUserStores(selectedEmployee!.id),
    enabled: !!selectedEmployee,
  });

  const { data: pendingSchedules } = useQuery({
    queryKey: ['pendingSchedules', 'employee', selectedEmployee?.id],
    queryFn: () => api.getSchedules(1, 200, { employeeId: selectedEmployee!.id, status: 'Pending' }),
    enabled: !!selectedEmployee,
  });

  const storeDueDates = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of pendingSchedules?.items ?? []) {
      if (!map[s.storeId] || s.dueDate < map[s.storeId]) {
        map[s.storeId] = s.dueDate;
      }
    }
    return map;
  }, [pendingSchedules]);

  const assignMutation = useMutation({
    mutationFn: (storeId: string) => api.assignStore(selectedEmployee!.id, storeId, dueDates[storeId] || undefined),
    onSuccess: (_data, storeId) => {
      queryClient.invalidateQueries({ queryKey: ['userStores', selectedEmployee?.id] });
      queryClient.invalidateQueries({ queryKey: ['allStores'] });
      queryClient.invalidateQueries({ queryKey: ['allStoresAssign'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['pendingSchedules', 'employee', selectedEmployee?.id] });
      setDueDates(prev => { const next = { ...prev }; delete next[storeId]; return next; });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (storeId: string) => api.unassignStore(selectedEmployee!.id, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStores', selectedEmployee?.id] });
      queryClient.invalidateQueries({ queryKey: ['allStores'] });
      queryClient.invalidateQueries({ queryKey: ['allStoresAssign'] });
      queryClient.invalidateQueries({ queryKey: ['pendingSchedules', 'employee', selectedEmployee?.id] });
    },
  });

  const assignedIds = new Set(assignedStores?.map((s) => s.id) ?? []);
  const availableStores = stores?.items.filter(
    (s) => !assignedIds.has(s.id) && (!selectedEmployee?.regionId || s.regionId === selectedEmployee.regionId)
  );

  const filteredEmployees = employees?.items.filter(
    (e) => !assignSearch || e.fullName.toLowerCase().includes(assignSearch.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left panel — Employee list */}
      <div className="lg:col-span-4 xl:col-span-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('adminAssign.employees' as any)}</h3>
              <span className="text-xs text-slate-400 font-medium">{filteredEmployees?.length ?? 0} {t('common.total')}</span>
            </div>
            <RegionSelect value={assignRegion} onChange={setAssignRegion} includeAll />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder={t('adminAssign.searchByName')} className="pl-9 h-9 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} />
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto">
            {filteredEmployees?.map((emp) => {
              const isSelected = selectedEmployee?.id === emp.id;
              const initials = emp.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={cn(
                    'w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-150',
                    isSelected
                      ? 'bg-primary/5 border-l-[3px] border-l-primary'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-[3px] border-l-transparent'
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    isSelected ? 'bg-primary/15 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  )}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium truncate', isSelected && 'text-primary')}>{emp.fullName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-400 truncate">{emp.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <RegionBadge regionId={emp.regionId} />
                    <ChevronRight className={cn('h-3.5 w-3.5 text-slate-300', isSelected && 'text-primary')} />
                  </div>
                </button>
              );
            })}
            {filteredEmployees?.length === 0 && (
              <div className="px-4 py-12 text-center">
                <Users className="h-8 w-8 mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                <p className="text-sm text-slate-400">{t('adminAssign.noEmployeesFound' as any)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel — Assignment detail */}
      <div className="lg:col-span-8 xl:col-span-9">
        {selectedEmployee ? (
          <div className="space-y-5">
            {/* Selected employee header */}
            <div className="bg-gradient-to-r from-primary/5 via-violet-50/50 to-transparent dark:from-primary/10 dark:via-violet-900/10 rounded-xl p-4 border border-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                  {selectedEmployee.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{selectedEmployee.fullName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{selectedEmployee.email}</span>
                    <RegionBadge regionId={selectedEmployee.regionId} />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-primary">{assignedStores?.length ?? 0}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{t('adminAssign.assigned')}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <p className="text-lg font-bold text-slate-600 dark:text-slate-300">{availableStores?.length ?? 0}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{t('adminAssign.available')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Assigned stores */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('adminAssign.assignedStores')}</h4>
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20">{assignedStores?.length ?? 0}</span>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-[50vh] overflow-y-auto">
                  {assignedStores?.map((store) => (
                    <div key={store.id} className="px-4 py-3 flex items-center gap-3 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <StoreIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{store.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-slate-400">{store.city}</span>
                          <RegionBadge regionId={store.regionId} />
                          {storeDueDates[store.id] && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              <CalendarDays className="h-3 w-3" />
                              {format(new Date(storeDueDates[store.id]), 'MMM d, yyyy', { locale: dateLocale })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => unassignMutation.mutate(store.id)}
                        disabled={unassignMutation.isPending}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                        title="Unassign"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {assignedStores?.length === 0 && (
                    <div className="px-4 py-10 text-center">
                      <LinkIcon className="h-7 w-7 mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                      <p className="text-sm text-slate-400">{t('adminAssign.noStoresAssigned')}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{t('adminAssign.assignFromRight')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Available stores */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Plus className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('adminAssign.availableStores')}</h4>
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20">{availableStores?.length ?? 0}</span>
                </div>
                {selectedEmployee.regionId && (
                  <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {t('adminAssign.regionFiltered')}: <span className="font-medium text-slate-500">{getRegionName(selectedEmployee.regionId, language)}</span>
                    </p>
                  </div>
                )}
                <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-[50vh] overflow-y-auto">
                  {availableStores?.map((store) => (
                    <div key={store.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <StoreIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{store.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">{store.city}</span>
                            <RegionBadge regionId={store.regionId} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-11">
                        <Input
                          type="date"
                          className="h-8 text-xs flex-1 bg-slate-50 dark:bg-slate-800"
                          value={dueDates[store.id] || ''}
                          onChange={e => setDueDates(prev => ({ ...prev, [store.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1.5 px-3"
                          onClick={() => assignMutation.mutate(store.id)}
                          disabled={!dueDates[store.id] || assignMutation.isPending}
                        >
                          <Plus className="h-3 w-3" /> {t('adminAssign.assign' as any)}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {availableStores?.length === 0 && (
                    <div className="px-4 py-10 text-center">
                      <StoreIcon className="h-7 w-7 mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                      <p className="text-sm text-slate-400">{t('adminAssign.noStoresAvailable')}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{t('adminAssign.allAssigned')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl min-h-[400px]">
            <div className="text-center px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-1">{t('adminAssign.selectEmployee')}</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">{t('adminAssign.selectEmployeeDesc')}</p>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
                <ArrowRight className="h-3 w-3" /> <span>{t('adminAssign.clickToStart')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tab 2 — Store → Employee Assignments ──────────────────── */
function StoreEmployeeAssignmentsTab() {
  const { t, language, dateLocale } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [storeRegion, setStoreRegion] = useState('all');
  const [storeSearch, setStoreSearch] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [dueDates, setDueDates] = useState<Record<string, string>>({});

  const { data: storesData } = useQuery({
    queryKey: ['allStoresTab3', 1, 200, storeSearch, storeRegion],
    queryFn: () => api.getAllStores(1, 200, storeSearch || undefined, storeRegion !== 'all' ? storeRegion : undefined),
  });

  const selectedStoreId = searchParams.get('storeId');
  const selectedStore = storesData?.items.find(s => s.id === selectedStoreId) ?? null;

  const setSelectedStore = (store: Store | null) => {
    setSearchParams(prev => {
      if (store) { prev.set('storeId', store.id); } else { prev.delete('storeId'); }
      return prev;
    });
    setEmpSearch('');
  };

  const { data: assignedEmployees } = useQuery({
    queryKey: ['storeEmployees', selectedStore?.id],
    queryFn: () => api.getStoreEmployees(selectedStore!.id),
    enabled: !!selectedStore,
  });

  const { data: pendingSchedules } = useQuery({
    queryKey: ['pendingSchedules', 'store', selectedStore?.id],
    queryFn: () => api.getSchedules(1, 200, { storeId: selectedStore!.id, status: 'Pending' }),
    enabled: !!selectedStore,
  });

  const employeeDueDates = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of pendingSchedules?.items ?? []) {
      if (!map[s.employeeId] || s.dueDate < map[s.employeeId]) {
        map[s.employeeId] = s.dueDate;
      }
    }
    return map;
  }, [pendingSchedules]);

  const { data: allRegionEmployees } = useQuery({
    queryKey: ['allRegionEmployees', selectedStore?.regionId],
    queryFn: () => api.getAllUsers(1, 200, 'Employee', undefined, selectedStore?.regionId ?? undefined),
    enabled: !!selectedStore,
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) => api.assignStore(userId, selectedStore!.id, dueDates[userId] || undefined),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['storeEmployees', selectedStore?.id] });
      queryClient.invalidateQueries({ queryKey: ['allStores'] });
      queryClient.invalidateQueries({ queryKey: ['allStoresTab3'] });
      queryClient.invalidateQueries({ queryKey: ['allStoresAssign'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['pendingSchedules', 'store', selectedStore?.id] });
      setDueDates(prev => { const next = { ...prev }; delete next[userId]; return next; });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (userId: string) => api.unassignStore(userId, selectedStore!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeEmployees', selectedStore?.id] });
      queryClient.invalidateQueries({ queryKey: ['allStores'] });
      queryClient.invalidateQueries({ queryKey: ['allStoresTab3'] });
      queryClient.invalidateQueries({ queryKey: ['allStoresAssign'] });
      queryClient.invalidateQueries({ queryKey: ['pendingSchedules', 'store', selectedStore?.id] });
    },
  });

  const assignedIds = new Set(assignedEmployees?.map(e => e.id) ?? []);
  const availableEmployees = allRegionEmployees?.items.filter(
    (e) => !assignedIds.has(e.id) && (!empSearch || e.fullName.toLowerCase().includes(empSearch.toLowerCase()))
  ) ?? [];

  const filteredStores = storesData?.items ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left panel — Store list */}
      <div className="lg:col-span-4 xl:col-span-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('adminAssign.stores' as any)}</h3>
              <span className="text-xs text-slate-400 font-medium">{filteredStores.length} {t('common.total')}</span>
            </div>
            <RegionSelect value={storeRegion} onChange={setStoreRegion} includeAll />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder={t('adminAssign.searchStores')} className="pl-9 h-9 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} />
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto">
            {filteredStores.map((store) => {
              const isSelected = selectedStore?.id === store.id;
              return (
                <button
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  className={cn(
                    'w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-150',
                    isSelected
                      ? 'bg-primary/5 border-l-[3px] border-l-primary'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-[3px] border-l-transparent'
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    isSelected ? 'bg-primary/15' : 'bg-slate-100 dark:bg-slate-800'
                  )}>
                    <StoreIcon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-slate-400')} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium truncate', isSelected && 'text-primary')}>{store.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-400">{store.city}</span>
                      <span className="text-[11px] text-slate-300">·</span>
                      <span className="text-[11px] text-slate-400">{store.assignedEmployees} {t('adminAssign.staff' as any)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <RegionBadge regionId={store.regionId} />
                    <ChevronRight className={cn('h-3.5 w-3.5 text-slate-300', isSelected && 'text-primary')} />
                  </div>
                </button>
              );
            })}
            {filteredStores.length === 0 && (
              <div className="px-4 py-12 text-center">
                <StoreIcon className="h-8 w-8 mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                <p className="text-sm text-slate-400">{t('adminAssign.noStoresFound' as any)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel — Assignment detail */}
      <div className="lg:col-span-8 xl:col-span-9">
        {selectedStore ? (
          <div className="space-y-5">
            {/* Selected store header */}
            <div className="bg-gradient-to-r from-primary/5 via-violet-50/50 to-transparent dark:from-primary/10 dark:via-violet-900/10 rounded-xl p-4 border border-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                  <StoreIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{selectedStore.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{selectedStore.address}, {selectedStore.city}</span>
                    <RegionBadge regionId={selectedStore.regionId} />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-primary">{assignedEmployees?.length ?? 0}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{t('adminAssign.assigned')}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <p className="text-lg font-bold text-slate-600 dark:text-slate-300">{availableEmployees.length}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{t('adminAssign.available')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Assigned employees */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('adminAssign.assignedEmployees')}</h4>
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20">{assignedEmployees?.length ?? 0}</span>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-[50vh] overflow-y-auto">
                  {assignedEmployees?.map((emp) => {
                    const initials = emp.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <div key={emp.id} className="px-4 py-3 flex items-center gap-3 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{emp.fullName}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-400">{emp.email}</span>
                            {employeeDueDates[emp.id] && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                <CalendarDays className="h-3 w-3" />
                                {format(new Date(employeeDueDates[emp.id]), 'MMM d, yyyy', { locale: dateLocale })}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => unassignMutation.mutate(emp.id)}
                          disabled={unassignMutation.isPending}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                          title="Unassign"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  {assignedEmployees?.length === 0 && (
                    <div className="px-4 py-10 text-center">
                      <Users className="h-7 w-7 mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                      <p className="text-sm text-slate-400">{t('adminAssign.noEmployeesAssigned')}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{t('adminAssign.assignFromRight')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Available employees */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('adminAssign.availableEmployees')}</h4>
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20">{availableEmployees.length}</span>
                </div>
                <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {t('adminAssign.regionFiltered')}: <span className="font-medium text-slate-500">{getRegionName(selectedStore.regionId, language)}</span>
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                    <Input placeholder={t('adminAssign.filterByName')} className="pl-8 h-7 text-xs bg-white dark:bg-slate-900" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} />
                  </div>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-[50vh] overflow-y-auto">
                  {availableEmployees.map((emp) => {
                    const initials = emp.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <div key={emp.id} className="px-4 py-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{emp.fullName}</p>
                            <span className="text-[11px] text-slate-400">{emp.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-11">
                          <Input
                            type="date"
                            className="h-8 text-xs flex-1 bg-slate-50 dark:bg-slate-800"
                            value={dueDates[emp.id] || ''}
                            onChange={e => setDueDates(prev => ({ ...prev, [emp.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 px-3"
                            onClick={() => assignMutation.mutate(emp.id)}
                            disabled={!dueDates[emp.id] || assignMutation.isPending}
                          >
                            <Plus className="h-3 w-3" /> {t('adminAssign.assign' as any)}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {availableEmployees.length === 0 && (
                    <div className="px-4 py-10 text-center">
                      <Users className="h-7 w-7 mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                      <p className="text-sm text-slate-400">{t('adminAssign.noEmployeesAvailable')}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{t('adminAssign.allEmployeesAssigned')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl min-h-[400px]">
            <div className="text-center px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <StoreIcon className="h-7 w-7 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-1">{t('adminAssign.selectAStore' as any)}</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">{t('adminAssign.selectAStoreDesc' as any)}</p>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
                <ArrowRight className="h-3 w-3" /> <span>{t('adminAssign.clickStoreToStart')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */
export default function AdminAssignments() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'employee-to-store';

  const handleTabChange = (tab: string) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      prev.delete('storeId');
      prev.delete('employeeId');
      return prev;
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('adminAssign.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('adminAssign.subtitle')}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <TabsTrigger value="employee-to-store" className="gap-2 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" /> {t('adminAssign.empToStore')}
          </TabsTrigger>
          <TabsTrigger value="store-to-employee" className="gap-2 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <StoreIcon className="h-4 w-4" /> {t('adminAssign.storeToEmp')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employee-to-store" className="mt-5">
          <EmployeeAssignmentsTab />
        </TabsContent>

        <TabsContent value="store-to-employee" className="mt-5">
          <StoreEmployeeAssignmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
