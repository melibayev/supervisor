import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Search, Plus, Loader2, Pencil, Trash2, MapPin,
  Mail, Phone, Calendar, Shield, X, UserPlus, Clock, CheckCircle2, Camera,
  XCircle, CheckCircle, Filter
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { RegionBadge } from '@/components/RegionBadge';
import { RegionSelect } from '@/components/RegionSelect';
import { UZBEKISTAN_REGIONS, getRegionName } from '@/constants/regions';
import type { User, Store, PendingUser } from '@/types';
import { cn } from '@/lib/utils';

export default function AdminEmployees() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t, language, dateLocale } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'active';
  const setActiveTab = (tab: string) => {
    setSearchParams(prev => { prev.set('tab', tab); return prev; });
  };

  // Pending count for badge
  const { data: pendingCountData } = useQuery({
    queryKey: ['pending-users-count'],
    queryFn: () => api.getPendingCount(),
    refetchInterval: 30000,
  });
  const pendingCount = pendingCountData?.count ?? 0;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', phoneNumber: '', password: '', role: 'Employee', regionId: '', regionName: '' });
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phoneNumber: '', role: 'Employee', regionId: '', regionName: '' });

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, regionFilter],
    queryFn: () => api.getAllUsers(page, 20, undefined, search || undefined, regionFilter !== 'all' ? regionFilter : undefined)
  });

  const { data: userStores } = useQuery({
    queryKey: ['userStores', selectedUser?.id],
    queryFn: () => api.getUserStores(selectedUser!.id),
    enabled: !!selectedUser
  });

  const { data: allStoresData } = useQuery({
    queryKey: ['allStoresList'],
    queryFn: () => api.getAllStores(1, 200),
    enabled: showDetailPanel
  });

  const { data: userVisits } = useQuery({
    queryKey: ['userVisits', selectedUser?.id],
    queryFn: () => api.getAllVisits(1, 50, { userId: selectedUser!.id }),
    enabled: !!selectedUser && showDetailPanel
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => api.createUser(createForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateDialog(false);
      setCreateForm({ fullName: '', email: '', phoneNumber: '', password: '', role: 'Employee', regionId: '', regionName: '' });
    }
  });

  const editMutation = useMutation({
    mutationFn: () => api.updateUser(selectedUser!.id, editForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditDialog(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteUser(selectedUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeleteDialog(false);
      setShowDetailPanel(false);
      setSelectedUser(null);
    }
  });

  const assignMutation = useMutation({
    mutationFn: (storeId: string) => api.assignStore(selectedUser!.id, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStores', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['allStoresList'] });
    },
    onError: () => {
      // 409 = already assigned, just refresh the lists
      queryClient.invalidateQueries({ queryKey: ['userStores', selectedUser?.id] });
    }
  });

  const unassignMutation = useMutation({
    mutationFn: (storeId: string) => api.unassignStore(selectedUser!.id, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStores', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['allStoresList'] });
    }
  });

  const roleColors: Record<string, 'default' | 'secondary' | 'success'> = {
    SuperAdmin: 'default',
    Admin: 'secondary',
    Employee: 'success'
  };

  const openDetail = (user: User) => {
    navigate(`/admin/employees/${user.id}`);
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({ fullName: user.fullName, email: user.email, phoneNumber: user.phoneNumber, role: user.role, regionId: user.regionId ?? '', regionName: user.regionName ?? '' });
    setShowEditDialog(true);
  };

  const openDelete = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const assignedStoreIds = new Set(userStores?.map(s => s.id) ?? []);
  const availableStores = allStoresData?.items.filter(s => !assignedStoreIds.has(s.id) && (!selectedUser?.regionId || s.regionId === selectedUser.regionId)) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">{t('adminEmp.title')}</h1>
          <p className="text-secondary-500">{t('adminEmp.manageTeam')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> {t('adminEmp.addUser')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('active')}
            className={cn(
              'relative px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {t('adminEmp.allEmployees')}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'relative px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2',
              activeTab === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {t('adminEmp.pendingApproval')}
            {pendingCount > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-xs font-bold px-1.5',
                activeTab === 'pending' ? 'bg-primary text-white' : 'bg-red-500 text-white'
              )}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Employees Tab */}
      {activeTab === 'active' && (<>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('adminEmp.searchUsers' as any)}
            className="pl-9"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-48">
          <RegionSelect value={regionFilter} onChange={(v) => { setRegionFilter(v); setPage(1); }} includeAll />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground bg-secondary-50">
                    <th className="p-4 font-medium">{t('common.name')}</th>
                    <th className="p-4 font-medium">{t('common.email')}</th>
                    <th className="p-4 font-medium">{t('common.role')}</th>
                    <th className="p-4 font-medium">{t('common.region')}</th>
                    <th className="p-4 font-medium">{t('adminEmp.lastLogin' as any)}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map(user => (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 hover:bg-secondary-50 cursor-pointer"
                      onClick={() => openDetail(user)}
                    >
                      <td className="p-4 font-medium">{user.fullName}</td>
                      <td className="p-4 text-muted-foreground">{user.email}</td>
                      <td className="p-4">
                        <Badge variant={roleColors[user.role] || 'secondary'}>{t(('role.' + user.role) as any) || user.role}</Badge>
                      </td>
                      <td className="p-4">
                        <RegionBadge regionId={user.regionId} />
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, h:mm a', { locale: dateLocale }) : t('adminEmp.never' as any)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && Math.ceil(data.totalCount / data.pageSize) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('common.previous')}</Button>
          <span className="text-sm text-muted-foreground">{t('common.page')} {page} {t('common.of')} {Math.ceil(data.totalCount / data.pageSize)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.totalCount / data.pageSize)} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
        </div>
      )}

      {/* ===== DETAIL PANEL (Side Sheet) ===== */}
      {showDetailPanel && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowDetailPanel(false); setSelectedUser(null); }} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto animate-in slide-in-from-right">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">{t('adminEmp.employeeDetails' as any)}</h2>
              <button onClick={() => { setShowDetailPanel(false); setSelectedUser(null); }}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {selectedUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.fullName}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={roleColors[selectedUser.role] || 'secondary'}>{t(('role.' + selectedUser.role) as any) || selectedUser.role}</Badge>
                    <RegionBadge regionId={selectedUser.regionId} />
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedUser.phoneNumber || t('adminEmp.noPhone' as any)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{t('adminEmp.created' as any)} {format(new Date(selectedUser.createdAt), 'MMM d, yyyy', { locale: dateLocale })}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>{t('adminEmp.lastLogin' as any)}: {selectedUser.lastLoginAt ? format(new Date(selectedUser.lastLoginAt), 'MMM d, h:mm a', { locale: dateLocale }) : t('adminEmp.never' as any)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(selectedUser)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> {t('common.edit')}
                </Button>
                <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => openDelete(selectedUser)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {t('common.delete')}
                </Button>
              </div>

              {/* Assigned Stores */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> {t('adminEmp.assignedStores')} ({userStores?.length ?? 0})
                </h4>
                {userStores?.length ? (
                  <div className="space-y-2">
                    {userStores.map(store => (
                      <div key={store.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{store.name}</p>
                          <p className="text-xs text-muted-foreground">{store.address}, {store.city}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 h-8 w-8 p-0"
                          onClick={() => unassignMutation.mutate(store.id)}
                          title="Unassign"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('adminAssign.noStoresAssigned')}</p>
                )}
              </div>

              {/* Available Stores */}
              {availableStores.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-green-600" /> {t('adminEmp.availableStores' as any)} ({availableStores.length})
                    {selectedUser.regionId && <span className="text-xs font-normal text-muted-foreground">({getRegionName(selectedUser.regionId, language)} only)</span>}
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableStores.map(store => (
                      <div key={store.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{store.name}</p>
                          <p className="text-xs text-muted-foreground">{store.address}, {store.city}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 h-8"
                          onClick={() => assignMutation.mutate(store.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> {t('common.assign')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visit History */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" /> {t('adminEmp.visitHistory' as any)} ({userVisits?.totalCount ?? 0})
                </h4>
                {userVisits?.items.length ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {userVisits.items.map(visit => (
                      <div key={visit.id} className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
                        <div className={`p-2 rounded-full flex-shrink-0 ${
                          visit.status === 'Completed' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {visit.status === 'Completed'
                            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                            : <Clock className="h-4 w-4 text-yellow-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{visit.storeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(visit.checkInTime), 'MMM d, yyyy · h:mm a', { locale: dateLocale })}
                            {visit.checkOutTime && ` — ${format(new Date(visit.checkOutTime), 'h:mm a', { locale: dateLocale })}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Camera className="h-3 w-3" /> {visit.photos.length}
                          </span>
                          <Badge variant={visit.status === 'Completed' ? 'success' : 'warning'} className="text-[10px]">
                            {visit.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('adminEmp.noVisitHistory' as any)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CREATE DIALOG ===== */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('adminEmp.addNewUser' as any)}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>{t('auth.fullName')}</Label><Input value={createForm.fullName} onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })} /></div>
            <div><Label>{t('common.email')}</Label><Input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} /></div>
            <div><Label>{t('common.phone')}</Label><Input value={createForm.phoneNumber} onChange={e => setCreateForm({ ...createForm, phoneNumber: e.target.value })} /></div>
            <div><Label>{t('adminEmp.password')}</Label><Input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} /></div>
            <div>
              <Label>{t('common.role')}</Label>
              <select className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm" value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
                <option value="SuperAdmin">SuperAdmin</option>
              </select>
            </div>
            {createForm.role === 'Employee' && (
              <div>
                <Label>{t('common.region')}</Label>
                <RegionSelect
                  value={createForm.regionId}
                  onChange={(v) => {
                    const region = UZBEKISTAN_REGIONS.find(r => r.id === v);
                    setCreateForm({ ...createForm, regionId: v, regionName: region?.name ?? v });
                  }}
                  placeholder="Select region"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !createForm.fullName || !createForm.email || !createForm.password}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('adminEmp.createUser' as any)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT DIALOG ===== */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('adminEmp.editUser' as any)}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>{t('auth.fullName')}</Label><Input value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} /></div>
            <div><Label>{t('common.email')}</Label><Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div><Label>{t('common.phone')}</Label><Input value={editForm.phoneNumber} onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })} /></div>
            <div>
              <Label>{t('common.role')}</Label>
              <select className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
                <option value="SuperAdmin">SuperAdmin</option>
              </select>
            </div>
            {editForm.role === 'Employee' && (
              <div>
                <Label>{t('common.region')}</Label>
                <RegionSelect
                  value={editForm.regionId}
                  onChange={(v) => {
                    const region = UZBEKISTAN_REGIONS.find(r => r.id === v);
                    setEditForm({ ...editForm, regionId: v, regionName: region?.name ?? v });
                  }}
                  placeholder="Select region"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !editForm.fullName || !editForm.email}>
              {editMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('common.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE CONFIRMATION ===== */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('adminEmp.deleteUser' as any)}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('adminEmp.deleteConfirm' as any)} <span className="font-semibold text-secondary-900">{selectedUser?.fullName}</span>?
            {t('adminEmp.deactivateNote' as any)}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('adminEmp.deleteUser' as any)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </>)}

      {/* Pending Registrations Tab */}
      {activeTab === 'pending' && (
        <PendingRegistrationsTab queryClient={queryClient} />
      )}
    </div>
  );
}

/* ===== Pending Registrations Tab ===== */
function PendingRegistrationsTab({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const { t, dateLocale } = useTranslation();
  const [pendingRegionFilter, setPendingRegionFilter] = useState('all');
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['pending-users', pendingRegionFilter],
    queryFn: () => api.getPendingUsers(1, 100, pendingRegionFilter !== 'all' ? pendingRegionFilter : undefined),
  });

  const pendingUsers = pendingData?.items ?? [];

  const approveMutation = useMutation({
    mutationFn: (userId: string) => api.approveUser(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['pending-users'] });
      const previous = queryClient.getQueryData(['pending-users', pendingRegionFilter]);
      queryClient.setQueryData(['pending-users', pendingRegionFilter], (old: any) => ({
        ...old,
        items: old?.items?.filter((u: PendingUser) => u.id !== userId) ?? [],
      }));
      queryClient.setQueryData(['pending-users-count'], (old: any) => ({ count: Math.max(0, (old?.count ?? 1) - 1) }));
      return { previous };
    },
    onError: (_err, _userId, context) => {
      queryClient.setQueryData(['pending-users', pendingRegionFilter], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['pending-users-count'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => api.rejectUser(userId, reason),
    onMutate: async ({ userId }) => {
      await queryClient.cancelQueries({ queryKey: ['pending-users'] });
      const previous = queryClient.getQueryData(['pending-users', pendingRegionFilter]);
      queryClient.setQueryData(['pending-users', pendingRegionFilter], (old: any) => ({
        ...old,
        items: old?.items?.filter((u: PendingUser) => u.id !== userId) ?? [],
      }));
      queryClient.setQueryData(['pending-users-count'], (old: any) => ({ count: Math.max(0, (old?.count ?? 1) - 1) }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['pending-users', pendingRegionFilter], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['pending-users-count'] });
      setRejectingUserId(null);
      setRejectReason('');
    },
  });

  if (!isLoading && pendingUsers.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-16 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{t('adminEmp.allCaughtUp' as any)}</h3>
        <p className="text-sm text-slate-500">{t('adminEmp.noPendingNow' as any)}</p>
      </div>
    );
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{t('common.region')}:</span>
        </div>
        <div className="w-48">
          <RegionSelect value={pendingRegionFilter} onChange={setPendingRegionFilter} includeAll />
        </div>
        <span className="text-sm text-slate-500 ml-auto">
          {pendingUsers.length} {t('adminEmp.requestsPending' as any)}
        </span>
      </div>

      {/* Pending users list */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            </div>
          ))
          : pendingUsers.map(user => {
            const requestedAgo = user.registrationRequestedAt
              ? formatDistanceToNow(new Date(user.registrationRequestedAt), { addSuffix: true, locale: dateLocale })
              : '';
            const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            return (
              <div key={user.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-base">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{user.fullName}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail className="w-3 h-3" /> {user.email}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Phone className="w-3 h-3" /> {user.phoneNumber}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                            <Clock className="w-3 h-3" /> {t('common.pending')}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">{requestedAgo}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <RegionBadge regionId={user.regionId} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    {user.registrationRequestedAt && `${t('adminEmp.submitted' as any)} ${format(new Date(user.registrationRequestedAt), 'MMM d, yyyy', { locale: dateLocale })}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectingUserId(user.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    >
                      {rejectMutation.isPending && rejectMutation.variables?.userId === user.id
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> {t('adminEmp.rejecting' as any)}</>
                        : <><XCircle className="w-3.5 h-3.5 mr-1" /> {t('adminEmp.reject')}</>}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(user.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {approveMutation.isPending && approveMutation.variables === user.id
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> {t('adminEmp.approving' as any)}</>
                        : <><CheckCircle className="w-3.5 h-3.5 mr-1" /> {t('adminEmp.approve')}</>}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectingUserId !== null} onOpenChange={open => { if (!open) { setRejectingUserId(null); setRejectReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" /> {t('adminEmp.rejectRegistration' as any)}
            </DialogTitle>
            <DialogDescription>
              {t('adminEmp.rejectReasonPrompt' as any)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t('adminEmp.quickReasons' as any)}</p>
              <div className="flex flex-wrap gap-2">
                {[t('adminEmp.duplicateAccount' as any), t('adminEmp.invalidInfo' as any), t('adminEmp.notOurEmployee' as any), t('adminEmp.wrongRegion' as any)].map(reason => (
                  <button
                    key={reason}
                    onClick={() => setRejectReason(reason)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs border transition-colors',
                      rejectReason === reason
                        ? 'bg-red-100 dark:bg-red-900/30 border-red-300 text-red-700 dark:text-red-300 font-medium'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-200 hover:text-red-600'
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">{t('adminEmp.customReason' as any)}</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder={t('adminEmp.explainReject' as any)}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl resize-none outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectingUserId(null); setRejectReason(''); }} disabled={rejectMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => {
                if (rejectingUserId && rejectReason.trim()) {
                  rejectMutation.mutate({ userId: rejectingUserId, reason: rejectReason.trim() });
                }
              }}
            >
              {rejectMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> {t('adminEmp.rejecting' as any)}</>
                : <><XCircle className="w-4 h-4 mr-1" /> {t('adminEmp.rejectRequest' as any)}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
