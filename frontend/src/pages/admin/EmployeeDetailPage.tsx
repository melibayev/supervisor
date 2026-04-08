import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RegionBadge } from '@/components/RegionBadge';
import { RegionSelect } from '@/components/RegionSelect';
import { UZBEKISTAN_REGIONS } from '@/constants/regions';
import {
  ChevronLeft, Clock, Calendar, Pencil, Trash2, Mail, Phone, LogIn,
  Store, MapPin, CheckCircle, XCircle, ThumbsUp, ThumbsDown, Loader2, AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { EmployeeVisitHistoryTab } from '@/components/employees/EmployeeVisitHistoryTab';
import { EmployeeScheduleTab } from '@/components/employees/EmployeeScheduleTab';
import { useTranslation } from '@/i18n';
import type { EmployeeDetail, EmployeeDetailStats } from '@/types';

function EmployeeDetailSkeleton() {
  return (
    <div className="space-y-6 pb-10">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

function EmployeeStatsRow({ stats }: { stats: EmployeeDetailStats }) {
  const { t } = useTranslation();
  const items = [
    { label: t('empDetail.totalVisitsCount'), value: stats.totalVisits, icon: <MapPin className="w-4 h-4" />, bg: 'bg-violet-50 dark:bg-violet-500/10', iconBg: 'bg-violet-100 dark:bg-violet-500/20', color: 'text-violet-700 dark:text-violet-400' },
    { label: t('empDetail.completedVisits'), value: stats.completedVisits, icon: <CheckCircle className="w-4 h-4" />, bg: 'bg-green-50 dark:bg-green-500/10', iconBg: 'bg-green-100 dark:bg-green-500/20', color: 'text-green-700 dark:text-green-400' },
    { label: t('empDetail.approvedVisits'), value: stats.approvedVisits, icon: <ThumbsUp className="w-4 h-4" />, bg: 'bg-blue-50 dark:bg-blue-500/10', iconBg: 'bg-blue-100 dark:bg-blue-500/20', color: 'text-blue-700 dark:text-blue-400' },
    { label: t('empDetail.rejectedVisits' as any), value: stats.rejectedVisits, icon: <ThumbsDown className="w-4 h-4" />, bg: 'bg-red-50 dark:bg-red-500/10', iconBg: 'bg-red-100 dark:bg-red-500/20', color: 'text-red-700 dark:text-red-400' },
    { label: t('empDetail.missedVisits' as any), value: stats.missedVisits, icon: <XCircle className="w-4 h-4" />, bg: 'bg-orange-50 dark:bg-orange-500/10', iconBg: 'bg-orange-100 dark:bg-orange-500/20', color: 'text-orange-700 dark:text-orange-400' },
    { label: t('empDetail.pendingSchedule' as any), value: stats.pendingSchedules, icon: <Clock className="w-4 h-4" />, bg: 'bg-amber-50 dark:bg-amber-500/10', iconBg: 'bg-amber-100 dark:bg-amber-500/20', color: 'text-amber-700 dark:text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(item => (
        <div key={item.label} className={`${item.bg} rounded-2xl p-4 border border-white dark:border-slate-800`}>
          <div className={`w-8 h-8 ${item.iconBg} rounded-xl flex items-center justify-center ${item.color} mb-3`}>
            {item.icon}
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { t, dateLocale } = useTranslation();
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const activeTab = searchParams.get('tab') ?? 'visits';

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee-detail', employeeId],
    queryFn: () => api.getEmployeeDetail(employeeId!),
    enabled: !!employeeId,
  });

  const handleTabChange = (tab: string) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      prev.delete('page');
      prev.delete('schedulePage');
      return prev;
    });
  };

  if (isLoading) return <EmployeeDetailSkeleton />;
  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <XCircle className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">{t('empDetail.notFound')}</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/employees?tab=active')}>
          {t('empDetail.backToEmployees')}
        </Button>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    Active: { label: 'Active', bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-400' },
    Pending: { label: 'Pending', bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400' },
    Rejected: { label: 'Rejected', bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400' },
    Suspended: { label: 'Suspended', bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400' },
  };
  const status = statusConfig[employee.accountStatus] ?? statusConfig.Active;

  const initials = employee.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6 pb-10">
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/employees?tab=active')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {t('empDetail.backToEmployees')}
      </button>

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-violet-500 to-violet-700" />
        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {employee.avatarUrl ? (
                <img src={employee.avatarUrl} alt={employee.fullName} className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-violet-700 dark:text-violet-400">{initials}</span>
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${employee.accountStatus === 'Active' ? 'bg-green-500' : 'bg-slate-300'}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">{employee.fullName}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400">
                      {employee.role}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                    <RegionBadge regionId={employee.regionId} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" /> {t('empDetail.edit' as any)}
                  </Button>
                  {isSuperAdmin && (
                    <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="flex items-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-500/10">
                      <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Contact grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <span>{employee.phoneNumber || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <span>{t('empDetail.joined' as any)} {format(new Date(employee.createdAt), 'MMM d, yyyy', { locale: dateLocale })}</span>
                </div>
                {employee.lastLoginAt && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <LogIn className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <span>{t('empDetail.lastLogin' as any)} {formatDistanceToNow(new Date(employee.lastLoginAt), { addSuffix: true, locale: dateLocale })}</span>
                  </div>
                )}
              </div>

              {/* Assigned stores */}
              {employee.assignedStores?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">{t('empDetail.assignedStoresCard' as any)} ({employee.assignedStores.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {employee.assignedStores.map(store => (
                      <span key={store.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs">
                        <Store className="w-3 h-3" />
                        {store.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <EmployeeStatsRow stats={employee.stats} />

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-6">
          <div className="flex gap-0">
            <button
              onClick={() => handleTabChange('visits')}
              className={`px-5 py-4 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                activeTab === 'visits' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              {t('empDetail.visitHistoryTab')}
            </button>
            <button
              onClick={() => handleTabChange('schedule')}
              className={`px-5 py-4 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                activeTab === 'schedule' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {t('empDetail.scheduledVisitsTab')}
              {employee.stats.pendingSchedules > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-1">
                  {employee.stats.pendingSchedules}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="p-6">
          {activeTab === 'visits' && <EmployeeVisitHistoryTab employeeId={employeeId!} />}
          {activeTab === 'schedule' && <EmployeeScheduleTab employeeId={employeeId!} />}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <EditEmployeeModal employee={employee} onClose={() => setIsEditing(false)} />
      )}

      {/* Delete Dialog */}
      <DeleteEmployeeDialog
        employee={employee}
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={() => navigate('/admin/employees?tab=active')}
      />
    </div>
  );
}

/* ── Edit Employee Modal ── */
function EditEmployeeModal({ employee, onClose }: { employee: EmployeeDetail; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';

  const [form, setForm] = useState({
    fullName: employee.fullName,
    email: employee.email,
    phoneNumber: employee.phoneNumber,
    role: employee.role,
    regionId: employee.regionId ?? '',
    regionName: employee.regionName ?? '',
  });

  const updateMutation = useMutation({
    mutationFn: () => api.updateUser(employee.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-detail', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-violet-600" /> {t('empDetail.editEmployee' as any)}
          </DialogTitle>
          <DialogDescription>{t('empDetail.updateInfo' as any).replace('{name}', employee.fullName)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div><Label>{t('empDetail.fullName' as any)}</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
          <div><Label>{t('empDetail.email' as any)}</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>{t('empDetail.phoneNumber' as any)}</Label><Input value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} /></div>
          <div>
            <Label>{t('common.region')}</Label>
            <RegionSelect
              value={form.regionId}
              onChange={v => {
                const region = UZBEKISTAN_REGIONS.find(r => r.id === v);
                setForm({ ...form, regionId: v, regionName: region?.name ?? v });
              }}
              placeholder={t('empDetail.selectRegion' as any)}
            />
            {form.regionId && form.regionId !== employee.regionId && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                {t('empDetail.regionChangeWarning' as any)}
              </p>
            )}
          </div>
          {isSuperAdmin && (
            <div>
              <Label>{t('empDetail.role' as any)}</Label>
              <select className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
                <option value="SuperAdmin">SuperAdmin</option>
              </select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={updateMutation.isPending}>{t('common.cancel')}</Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="bg-violet-600 hover:bg-violet-700">
            {updateMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> {t('empDetail.saving' as any)}</> : t('common.saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Delete Employee Dialog ── */
function DeleteEmployeeDialog({ employee, open, onClose, onDeleted }: {
  employee: EmployeeDetail; open: boolean; onClose: () => void; onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteUser(employee.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.removeQueries({ queryKey: ['employee-detail', employee.id] });
      onDeleted();
    },
  });

  const isConfirmed = confirmText === employee.fullName;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" /> {t('empDetail.deleteEmployee' as any)}
          </DialogTitle>
          <DialogDescription>{t('empDetail.cannotUndo' as any)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-red-800 dark:text-red-400 mb-1">{t('empDetail.aboutToDelete' as any)}</p>
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{employee.fullName}</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{employee.email}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('empDetail.thisWill' as any)}</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li className="flex items-center gap-1.5"><XCircle className="w-3 h-3 text-red-500 flex-shrink-0" /> {t('empDetail.deactivateAccount' as any)}</li>
              <li className="flex items-center gap-1.5"><XCircle className="w-3 h-3 text-red-500 flex-shrink-0" /> {t('empDetail.removeAllAssignments' as any)}</li>
              <li className="flex items-center gap-1.5"><XCircle className="w-3 h-3 text-red-500 flex-shrink-0" /> {t('empDetail.cancelAllSchedules' as any)}</li>
            </ul>
          </div>
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1.5">
              {t('empDetail.typeName' as any)} <span className="font-semibold text-slate-900 dark:text-white">{employee.fullName}</span> {t('empDetail.typeNameToConfirm' as any)}
            </p>
            <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={employee.fullName} className="border-red-200 focus:ring-red-500" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleteMutation.isPending}>{t('common.cancel')}</Button>
          <Button variant="destructive" disabled={!isConfirmed || deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            {deleteMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> {t('empDetail.deleting' as any)}</> : t('empDetail.deleteEmployee' as any)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
