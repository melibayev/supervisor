import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Camera, Package, MapPin, Clock, CheckCircle2, X, Plus,
  Loader2, ArrowLeft, AlertTriangle, ImagePlus, Ban, ThumbsUp, ThumbsDown, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import type { ProductEntry } from '@/types';
import { ReviewStatusBadge } from '@/components/ReviewStatusBadge';
import { useTranslation } from '@/i18n';

export default function ActiveVisit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const geo = useGeolocation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [productForm, setProductForm] = useState({ brand: 'LG', category: '', model: '', displayType: '', quantity: 1, price: 0, notes: '' });
  const [reviewComment, setReviewComment] = useState('');
  const [requiresRevisit, setRequiresRevisit] = useState(false);
  const [commentText, setCommentText] = useState('');
  const { t, dateLocale } = useTranslation();

  const { data: visit, isLoading } = useQuery({
    queryKey: ['visit', id],
    queryFn: () => api.getVisit(id!),
    refetchInterval: 10000
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadingPhoto(true);
      const pos = await geo.getCurrentPosition();
      return api.uploadPhoto(id!, file, pos.latitude, pos.longitude, 'General');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit', id] });
      setUploadingPhoto(false);
    },
    onError: () => setUploadingPhoto(false)
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: string) => api.deletePhoto(id!, photoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visit', id] })
  });

  const addProductMutation = useMutation({
    mutationFn: (data: typeof productForm) => api.addProduct(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit', id] });
      setShowProductDialog(false);
      setProductForm({ brand: 'LG', category: '', model: '', displayType: '', quantity: 1, price: 0, notes: '' });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => api.deleteProduct(id!, productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visit', id] })
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const pos = await geo.getCurrentPosition();
      return api.checkOut(id!, pos.latitude, pos.longitude, checkoutNotes || undefined);
    },
    onSuccess: () => {
      queryClient.setQueryData(['activeVisit'], null);
      queryClient.removeQueries({ queryKey: ['visit', id] });
      queryClient.invalidateQueries({ queryKey: ['myStores'] });
      queryClient.invalidateQueries({ queryKey: ['myVisits'] });
      queryClient.invalidateQueries({ queryKey: ['mySchedules'] });
      queryClient.invalidateQueries({ queryKey: ['myTodaySchedules'] });
      navigate('/dashboard');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelVisit(id!),
    onSuccess: () => {
      queryClient.setQueryData(['activeVisit'], null);
      queryClient.removeQueries({ queryKey: ['visit', id] });
      queryClient.invalidateQueries({ queryKey: ['myVisits'] });
      navigate('/dashboard');
    }
  });

  // Admin review mutations & comments
  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['visitComments', id],
    queryFn: () => api.getVisitComments(id!),
    enabled: isAdmin && !!id
  });

  const approveMutation = useMutation({
    mutationFn: ({ visitId, comment }: { visitId: string; comment: string }) => api.approveVisit(visitId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit', id] });
      queryClient.invalidateQueries({ queryKey: ['unreviewedCount'] });
      queryClient.invalidateQueries({ queryKey: ['allVisits'] });
      setReviewComment('');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ visitId, comment, revisit }: { visitId: string; comment: string; revisit: boolean }) => api.rejectVisit(visitId, comment, revisit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit', id] });
      queryClient.invalidateQueries({ queryKey: ['unreviewedCount'] });
      queryClient.invalidateQueries({ queryKey: ['allVisits'] });
      setReviewComment('');
      setRequiresRevisit(false);
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ visitId, text }: { visitId: string; text: string }) => api.addVisitComment(visitId, text),
    onSuccess: () => {
      refetchComments();
      setCommentText('');
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      await uploadPhotoMutation.mutateAsync(files[i]);
    }
    e.target.value = '';
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!visit) return <div className="text-center py-20">{t('visit.notFound')}</div>;

  const isActive = visit.status === 'InProgress';
  const duration = visit.checkOutTime
    ? Math.round((new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime()) / 60000)
    : Math.round((Date.now() - new Date(visit.checkInTime).getTime()) / 60000);

  const canComplete = visit.photos.length >= 1;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-secondary-900">{visit.storeName}</h1>
          <p className="text-sm text-secondary-500">{visit.storeAddress}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('visit.visitedBy' as any)} <span className="font-medium">{visit.userName}</span> · {format(new Date(visit.checkInTime), 'MMM d, yyyy · h:mm a', { locale: dateLocale })}
          </p>
        </div>
        <Badge variant={visit.status === 'Completed' ? 'success' : 'warning'}>
          {t(('common.' + visit.status.toLowerCase()) as any) || visit.status}
        </Badge>
      </div>

      {/* Review Status */}
      {visit.status === 'Completed' && (
        <Card className={visit.reviewStatus === 'Approved' ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-500/5' : visit.reviewStatus === 'Rejected' ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-500/5' : ''}>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <ReviewStatusBadge status={visit.reviewStatus} />
              {visit.reviewedByAdminName && (
                <span className="text-xs text-muted-foreground">
                  {t('visit.by')} {visit.reviewedByAdminName}
                  {visit.reviewedAt && ` ${format(new Date(visit.reviewedAt), 'MMM d, yyyy', { locale: dateLocale })}`}
                </span>
              )}
            </div>
            {visit.requiresRevisit && (
              <Badge variant="destructive" className="text-[10px]">{t('visit.revisitRequired')}</Badge>
            )}
          </CardContent>
          {visit.reviewComment && (
            <CardContent className="pt-0 pb-3">
              <p className="text-sm text-muted-foreground italic">"{visit.reviewComment}"</p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Visit info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <Clock className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{duration}m</p>
            <p className="text-xs text-muted-foreground">{t('visit.duration')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <MapPin className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{visit.distanceFromStore.toFixed(0)}m</p>
            <p className="text-xs text-muted-foreground">{t('visit.distance')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <Camera className="h-5 w-5 text-purple-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{visit.photos.length}</p>
            <p className="text-xs text-muted-foreground">{t('visit.photosCount')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <Package className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{visit.products.length}</p>
            <p className="text-xs text-muted-foreground">{t('visit.productsCount')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons for active visit */}
      {isActive && (
        <div className="space-y-3">
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFileSelect} />
          <div className="flex gap-3">
            <Button className="flex-1" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
              {uploadingPhoto ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
              {t('visit.takePhoto')}
            </Button>
            <Button className="flex-1" variant="outline" onClick={() => setShowProductDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> {t('visit.addProduct')}
            </Button>
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => setShowCompleteDialog(true)}
              disabled={!canComplete}
              title={!canComplete ? t('visit.uploadMinPhoto') : ''}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> {t('visit.checkOut')}
            </Button>
            <Button className="flex-1" variant="outline" onClick={() => setShowCancelDialog(true)}>
              <Ban className="h-4 w-4 mr-2" /> {t('visit.cancelVisit')}
            </Button>
          </div>
          {!canComplete && (
            <p className="text-xs text-amber-600 text-center">{t('visit.uploadMinPhoto')}</p>
          )}
        </div>
      )}

      {/* GPS Warning */}
      {!visit.gpsVerified && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {t('visit.gpsWarning').replace('{d}', visit.distanceFromStore.toFixed(0))}
        </div>
      )}

      <Tabs defaultValue="photos">
        <TabsList className="w-full">
          <TabsTrigger value="photos" className="flex-1">{t('visit.photosTab').replace('{n}', String(visit.photos.length))}</TabsTrigger>
        </TabsList>

        <TabsContent value="photos">
          {visit.photos.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ImagePlus className="h-12 w-12 text-secondary-300 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('visit.noPhotos')}</p>
                {isActive && (
                  <Button variant="outline" className="mt-4" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-4 w-4 mr-2" /> {t('visit.takeFirstPhoto')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {visit.photos.map(photo => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-secondary-100 aspect-square">
                  <img src={photo.photoUrl} alt={photo.caption || 'Visit photo'} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs">{format(new Date(photo.capturedAt), 'h:mm a', { locale: dateLocale })}</p>
                  </div>
                  {isActive && (
                    <button
                      onClick={() => deletePhotoMutation.mutate(photo.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                      title="Delete photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Admin Review & Comments Section */}
      {isAdmin && visit.status === 'Completed' && (
        <Card>
          <CardContent className="py-5 space-y-4">
            {/* Review actions — show when not reviewed or when rejected (allow re-review) */}
            {(!visit.reviewStatus || visit.reviewStatus === 'Rejected') && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-primary" /> {t('visit.reviewVisit')}
                </h3>
                <textarea
                  className="w-full rounded-md border border-input px-3 py-2 text-sm min-h-[80px] bg-background"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder={t('visit.feedbackPlaceholder')}
                />
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="requiresRevisit" checked={requiresRevisit} onChange={e => setRequiresRevisit(e.target.checked)} className="rounded" />
                  <label htmlFor="requiresRevisit" className="text-sm text-muted-foreground">{t('visit.requiresRevisit')}</label>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => approveMutation.mutate({ visitId: visit.id, comment: reviewComment })}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-1.5" />}
                    {t('visit.approve')}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => rejectMutation.mutate({ visitId: visit.id, comment: reviewComment, revisit: requiresRevisit })}
                    disabled={rejectMutation.isPending || !reviewComment}
                  >
                    {rejectMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ThumbsDown className="h-4 w-4 mr-1.5" />}
                    {t('visit.reject')}
                  </Button>
                </div>
              </div>
            )}

            {/* Comments thread */}
            <div className={visit.reviewStatus && visit.reviewStatus !== 'Rejected' ? '' : 'border-t pt-4'}>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" /> {t('visit.comments').replace('{n}', String(comments?.length ?? 0))}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                {comments && comments.length > 0 ? comments.map((c: any) => (
                  <div key={c.id} className={`p-2.5 rounded-lg text-sm ${c.authorRole === 'Admin' ? 'bg-blue-50 dark:bg-blue-900/20 ml-4' : 'bg-slate-50 dark:bg-slate-800/50 mr-4'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs">{c.authorName}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(c.createdAt), 'MMM d, h:mm a', { locale: dateLocale })}</span>
                    </div>
                    <p className="text-sm">{c.text}</p>
                  </div>
                )) : (
                  <p className="text-xs text-muted-foreground text-center py-2">{t('visit.noComments')}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={t('visit.addComment')}
                  className="flex-1"
                  onKeyDown={e => { if (e.key === 'Enter' && commentText.trim()) addCommentMutation.mutate({ visitId: visit.id, text: commentText.trim() }); }}
                />
                <Button size="sm" disabled={!commentText.trim() || addCommentMutation.isPending} onClick={() => addCommentMutation.mutate({ visitId: visit.id, text: commentText.trim() })}>
                  {t('visit.send')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('visit.addProductTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('visit.brand')}</Label><Input value={productForm.brand} onChange={e => setProductForm({ ...productForm, brand: e.target.value })} /></div>
              <div><Label>{t('visit.category')}</Label><Input placeholder={t('visit.category')} value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('visit.model')}</Label><Input placeholder={t('visit.model')} value={productForm.model} onChange={e => setProductForm({ ...productForm, model: e.target.value })} /></div>
              <div><Label>{t('visit.displayType')}</Label><Input placeholder={t('visit.displayType')} value={productForm.displayType} onChange={e => setProductForm({ ...productForm, displayType: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('visit.quantity')}</Label><Input type="number" min={1} value={productForm.quantity} onChange={e => setProductForm({ ...productForm, quantity: Number(e.target.value) })} /></div>
              <div><Label>{t('visit.price')}</Label><Input type="number" min={0} step="0.01" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: Number(e.target.value) })} /></div>
            </div>
            <div><Label>{t('common.notes')}</Label><Input placeholder={t('visit.notesPlaceholder')} value={productForm.notes} onChange={e => setProductForm({ ...productForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => addProductMutation.mutate(productForm)} disabled={!productForm.category || !productForm.model || addProductMutation.isPending}>
              {addProductMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('visit.addProductTitle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Visit Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('visit.completeVisit')}</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('visit.completeDesc').replace('{duration}', String(duration)).replace('{photos}', String(visit.photos.length)).replace('{products}', String(visit.products.length))}
            </p>
            <Label>{t('visit.notesOptional')}</Label>
            <Input placeholder={t('visit.notesPlaceholder')} value={checkoutNotes} onChange={e => setCheckoutNotes(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              {completeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {t('visit.completeVisit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Visit Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('visit.cancelVisitTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('visit.cancelVisitDesc')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>{t('visit.goBack')}</Button>
            <Button variant="destructive" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
              {t('visit.cancelVisit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
