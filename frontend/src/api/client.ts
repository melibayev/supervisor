import type { LoginRequest, LoginResponse } from '@/types';

const BASE_URL = '/api';

class ApiClient {
  private accessToken: string | null = null;

  setToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>)
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    if (response.status === 401) {
      // Only attempt token refresh if we were authenticated (have a token).
      // Unauthenticated requests (login/register) should pass the original error through.
      if (this.accessToken) {
        const refreshed = await this.tryRefresh();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retry = await fetch(`${BASE_URL}${path}`, { ...options, headers });
          if (!retry.ok) throw new ApiError(retry.status, await retry.text());
          if (retry.status === 204) return undefined as T;
          const retryText = await retry.text();
          return retryText ? JSON.parse(retryText) : (undefined as T);
        }
        window.dispatchEvent(new Event('auth:logout'));
        throw new ApiError(401, 'Session expired');
      }
      const text = await response.text();
      throw new ApiError(response.status, text);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(response.status, text);
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return text ? JSON.parse(text) : (undefined as T);
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!res.ok) return false;

      const data: LoginResponse = await res.json();
      this.accessToken = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // Auth
  login(data: LoginRequest) {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  getMe() {
    return this.request<LoginResponse['user']>('/auth/me');
  }

  register(data: { fullName: string; email: string; phoneNumber: string; password: string; regionId: string }) {
    return this.request<{ message: string; userId: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }

  // Stores
  getMyStores() {
    return this.request<import('@/types').Store[]>('/stores/my');
  }

  getNearbyStores(lat: number, lng: number, radiusKm = 10) {
    return this.request<import('@/types').NearbyStore[]>(
      `/stores/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`
    );
  }

  getAllStores(page = 1, pageSize = 20, search?: string, region?: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    if (region && region !== 'all') params.set('region', region);
    return this.request<import('@/types').PagedResult<import('@/types').Store>>(`/stores?${params}`);
  }

  createStore(data: { name: string; address: string; city: string; latitude: number; longitude: number; geofenceRadius: number; regionId: string; regionName: string }) {
    return this.request<import('@/types').Store>('/stores', { method: 'POST', body: JSON.stringify(data) });
  }

  updateStore(id: string, data: object) {
    return this.request(`/stores/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  deleteStore(id: string) {
    return this.request(`/stores/${id}`, { method: 'DELETE' });
  }

  // Store Detail
  getStoreDetail(id: string) {
    return this.request<import('@/types').StoreDetail>(`/stores/${id}/detail`);
  }

  getStoreVisits(id: string, page = 1, pageSize = 10, filters?: { status?: string; from?: string; to?: string }) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters?.status) params.set('status', filters.status);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    return this.request<import('@/types').PagedResult<import('@/types').StoreVisitItem>>(`/stores/${id}/visits?${params}`);
  }

  getStoreSchedules(id: string, page = 1, pageSize = 10, filters?: { status?: string; from?: string; to?: string }) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters?.status) params.set('status', filters.status);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    return this.request<import('@/types').PagedResult<import('@/types').StoreScheduleItem>>(`/stores/${id}/schedules?${params}`);
  }

  // Users
  getAllUsers(page = 1, pageSize = 20, role?: string, search?: string, region?: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    if (region && region !== 'all') params.set('region', region);
    return this.request<import('@/types').PagedResult<import('@/types').User>>(`/users?${params}`);
  }

  createUser(data: { fullName: string; email: string; phoneNumber: string; password: string; role: string; regionId?: string; regionName?: string }) {
    return this.request<import('@/types').User>('/users', { method: 'POST', body: JSON.stringify(data) });
  }

  updateUser(id: string, data: object) {
    return this.request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  updateProfile(data: { fullName: string; email: string; phoneNumber: string }) {
    return this.request<import('@/types').User>('/auth/me', { method: 'PUT', body: JSON.stringify(data) });
  }

  changeUserRole(id: string, role: string) {
    return this.request(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
  }

  resetUserPassword(id: string, newPassword: string) {
    return this.request(`/users/${id}/reset-password`, { method: 'PUT', body: JSON.stringify({ newPassword }) });
  }

  deleteUser(id: string) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }

  assignStore(userId: string, storeId: string, dueDate?: string) {
    return this.request(`/users/${userId}/stores/${storeId}`, {
      method: 'POST',
      body: dueDate ? JSON.stringify({ dueDate }) : undefined,
    });
  }

  unassignStore(userId: string, storeId: string) {
    return this.request(`/users/${userId}/stores/${storeId}`, { method: 'DELETE' });
  }

  getUserStores(userId: string) {
    return this.request<import('@/types').Store[]>(`/users/${userId}/stores`);
  }

  getPendingUsers(page = 1, pageSize = 20, regionId?: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (regionId && regionId !== 'all') params.set('regionId', regionId);
    return this.request<import('@/types').PagedResult<import('@/types').PendingUser>>(`/users/pending?${params}`);
  }

  getPendingCount() {
    return this.request<{ count: number }>('/users/pending/count');
  }

  approveUser(id: string) {
    return this.request<{ message: string }>(`/users/${id}/approve`, { method: 'POST' });
  }

  rejectUser(id: string, reason: string) {
    return this.request<{ message: string }>(`/users/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
  }

  getStoreEmployees(storeId: string) {
    return this.request<import('@/types').User[]>(`/stores/${storeId}/employees`);
  }

  // Employee Detail
  getEmployeeDetail(id: string) {
    return this.request<import('@/types').EmployeeDetail>(`/users/${id}`);
  }

  getEmployeeVisits(id: string, page = 1, pageSize = 10, filters?: { status?: string; from?: string; to?: string }) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters?.status) params.set('status', filters.status);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    return this.request<import('@/types').PagedResult<import('@/types').EmployeeVisitItem>>(`/users/${id}/visits?${params}`);
  }

  getEmployeeSchedules(id: string, page = 1, pageSize = 10, filters?: { status?: string; from?: string; to?: string }) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters?.status) params.set('status', filters.status);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    return this.request<import('@/types').PagedResult<import('@/types').EmployeeScheduleItem>>(`/users/${id}/schedules?${params}`);
  }

  // Visits
  getActiveVisit() {
    return this.request<import('@/types').Visit | null>('/visits/active');
  }

  getMyVisits(page = 1, pageSize = 20) {
    return this.request<import('@/types').PagedResult<import('@/types').Visit>>(
      `/visits/my?page=${page}&pageSize=${pageSize}`
    );
  }

  getAllVisits(page = 1, pageSize = 20, filters?: { userId?: string; storeId?: string; status?: string; from?: string; to?: string; regionId?: string; reviewStatus?: string }) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters?.userId) params.set('userId', filters.userId);
    if (filters?.storeId) params.set('storeId', filters.storeId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.regionId) params.set('regionId', filters.regionId);
    if (filters?.reviewStatus) params.set('reviewStatus', filters.reviewStatus);
    return this.request<import('@/types').PagedResult<import('@/types').Visit>>(`/visits?${params}`);
  }

  getVisit(id: string) {
    return this.request<import('@/types').Visit>(`/visits/${id}`);
  }

  startVisit(storeId: string, latitude: number, longitude: number) {
    return this.request<import('@/types').Visit>('/visits/start', {
      method: 'POST',
      body: JSON.stringify({ storeId, latitude, longitude })
    });
  }

  checkOut(visitId: string, latitude: number, longitude: number, notes?: string) {
    return this.request<import('@/types').Visit>(`/visits/${visitId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, notes })
    });
  }

  uploadPhoto(visitId: string, file: File, latitude: number, longitude: number, type: string, caption?: string) {
    const form = new FormData();
    form.append('file', file);
    form.append('latitude', String(latitude));
    form.append('longitude', String(longitude));
    form.append('type', type);
    if (caption) form.append('caption', caption);
    return this.request<import('@/types').VisitPhoto>(`/visits/${visitId}/photos`, { method: 'POST', body: form });
  }

  addProduct(visitId: string, data: { brand: string; category: string; model: string; displayType: string; quantity: number; price: number; notes?: string }) {
    return this.request<import('@/types').ProductEntry>(`/visits/${visitId}/products`, { method: 'POST', body: JSON.stringify(data) });
  }

  updateProduct(visitId: string, productId: string, data: object) {
    return this.request(`/visits/${visitId}/products/${productId}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  deleteProduct(visitId: string, productId: string) {
    return this.request(`/visits/${visitId}/products/${productId}`, { method: 'DELETE' });
  }

  deletePhoto(visitId: string, photoId: string) {
    return this.request(`/visits/${visitId}/photos/${photoId}`, { method: 'DELETE' });
  }

  cancelVisit(visitId: string) {
    return this.request(`/visits/${visitId}/cancel`, { method: 'POST' });
  }



  // Analytics
  getOverview(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.request<import('@/types').OverviewStats>(`/analytics/overview?${params}`);
  }

  getEmployeeStats(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.request<import('@/types').EmployeeStats[]>(`/analytics/employees?${params}`);
  }

  getStoreAnalytics(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.request<import('@/types').StoreAnalytics[]>(`/analytics/stores?${params}`);
  }

  getBrandStats(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.request<import('@/types').BrandStats[]>(`/analytics/brands?${params}`);
  }

  getDailyStats(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.request<import('@/types').DailyStats[]>(`/analytics/daily?${params}`);
  }

  // New Analytics endpoints
  getCompletionRate(from?: string, to?: string, regionId?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (regionId && regionId !== 'all') params.set('regionId', regionId);
    return this.request<import('@/types').CompletionRateData>(`/analytics/completion-rate?${params}`);
  }

  getEmployeeLeaderboard(from?: string, to?: string, regionId?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (regionId && regionId !== 'all') params.set('regionId', regionId);
    return this.request<import('@/types').EmployeeLeaderboardData>(`/analytics/employee-leaderboard?${params}`);
  }

  getStoreFrequency(from?: string, to?: string, regionId?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (regionId && regionId !== 'all') params.set('regionId', regionId);
    return this.request<import('@/types').StoreFrequencyData>(`/analytics/store-frequency?${params}`);
  }

  getApprovalRate(from?: string, to?: string, regionId?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (regionId && regionId !== 'all') params.set('regionId', regionId);
    return this.request<import('@/types').ApprovalRateData>(`/analytics/approval-rate?${params}`);
  }

  getRegionalComparison(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.request<import('@/types').RegionalComparisonData>(`/analytics/regional-comparison?${params}`);
  }

  getMissedPatterns(from?: string, to?: string, regionId?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (regionId && regionId !== 'all') params.set('regionId', regionId);
    return this.request<import('@/types').MissedPatternsData>(`/analytics/missed-patterns?${params}`);
  }

  getAnalyticsLiveFeed(limit = 30) {
    return this.request<import('@/types').LiveFeedData>(`/analytics/live-feed?limit=${limit}`);
  }

  // Audit
  getAuditLogs(page = 1, pageSize = 50, filters?: { userId?: string; action?: string; from?: string; to?: string; entityType?: string; regionId?: string }) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters?.userId) params.set('userId', filters.userId);
    if (filters?.action) params.set('action', filters.action);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.entityType) params.set('entityType', filters.entityType);
    if (filters?.regionId && filters.regionId !== 'all') params.set('regionId', filters.regionId);
    return this.request<import('@/types').PagedResult<import('@/types').AuditLog>>(`/audit-logs?${params}`);
  }

  // Schedules
  getSchedules(page = 1, pageSize = 50, filters?: { date?: string; regionId?: string; employeeId?: string; storeId?: string; status?: string; from?: string; to?: string }) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters?.date) params.set('date', filters.date);
    if (filters?.regionId && filters.regionId !== 'all') params.set('regionId', filters.regionId);
    if (filters?.employeeId) params.set('employeeId', filters.employeeId);
    if (filters?.storeId) params.set('storeId', filters.storeId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    return this.request<import('@/types').PagedResult<import('@/types').VisitSchedule>>(`/schedules?${params}`);
  }

  getSchedule(id: string) {
    return this.request<import('@/types').VisitSchedule>(`/schedules/${id}`);
  }

  createSchedule(data: { employeeId: string; storeId: string; dueDate: string; dueTime?: string; adminNotes?: string }) {
    return this.request<import('@/types').VisitSchedule>('/schedules', { method: 'POST', body: JSON.stringify(data) });
  }

  bulkCreateSchedules(data: { employeeIds: string[]; storeIds: string[]; startDate: string; endDate: string; adminNotes?: string }) {
    return this.request<{ created: number }>('/schedules/bulk', { method: 'POST', body: JSON.stringify(data) });
  }

  updateSchedule(id: string, data: { dueDate?: string; dueTime?: string; adminNotes?: string }) {
    return this.request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  cancelSchedule(id: string) {
    return this.request(`/schedules/${id}`, { method: 'DELETE' });
  }

  getMySchedules(date?: string) {
    const params = date ? `?date=${date}` : '';
    return this.request<import('@/types').VisitSchedule[]>(`/schedules/my${params}`);
  }

  getMyTodaySchedules() {
    return this.request<import('@/types').VisitSchedule[]>('/schedules/my/today');
  }

  getMissedSchedules(from?: string, to?: string, regionId?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (regionId && regionId !== 'all') params.set('regionId', regionId);
    return this.request<import('@/types').VisitSchedule[]>(`/schedules/missed?${params}`);
  }

  // Visit Review
  approveVisit(id: string, comment?: string) {
    return this.request(`/visits/${id}/approve`, { method: 'POST', body: JSON.stringify({ comment }) });
  }

  rejectVisit(id: string, comment?: string, requiresRevisit = false) {
    return this.request(`/visits/${id}/reject`, { method: 'POST', body: JSON.stringify({ comment, requiresRevisit }) });
  }

  getUnreviewedCount() {
    return this.request<{ count: number }>('/visits/unreviewed-count');
  }

  // Visit Comments
  getVisitComments(visitId: string) {
    return this.request<import('@/types').VisitComment[]>(`/visits/${visitId}/comments`);
  }

  addVisitComment(visitId: string, text: string) {
    return this.request<import('@/types').VisitComment>(`/visits/${visitId}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
  }

  markCommentRead(visitId: string, commentId: string) {
    return this.request(`/visits/${visitId}/comments/${commentId}/read`, { method: 'PUT' });
  }

  // Notifications
  getNotifications(page = 1, pageSize = 20, unreadOnly?: boolean) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (unreadOnly) params.set('unreadOnly', 'true');
    return this.request<import('@/types').PagedResult<import('@/types').Notification>>(`/notifications?${params}`);
  }

  getUnreadNotificationCount() {
    return this.request<{ count: number }>('/notifications/unread-count');
  }

  markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }

  markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PUT' });
  }

  deleteNotification(id: string) {
    return this.request(`/notifications/${id}`, { method: 'DELETE' });
  }

  // Dashboard
  getDashboardSummary() {
    return this.request<import('@/types').DashboardSummary>('/dashboard/summary');
  }

  getDashboardTodayProgress() {
    return this.request<import('@/types').DashboardTodayProgress>('/dashboard/today-progress');
  }

  getDashboardStoreCoverage() {
    return this.request<import('@/types').DashboardStoreCoverage>('/dashboard/store-coverage');
  }

  getDashboardPinned() {
    return this.request<import('@/types').DashboardPinnedData>('/dashboard/pinned-analytics');
  }

  updateDashboardPinned(widgetId: string, action: 'pin' | 'unpin') {
    return this.request<import('@/types').DashboardPinnedData>('/dashboard/pinned-analytics', {
      method: 'POST',
      body: JSON.stringify({ widgetId, action }),
    });
  }
}

export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API Error ${status}: ${body}`);
  }
}

export const api = new ApiClient();
