export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'Employee' | 'Admin' | 'SuperAdmin';
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  regionId: string | null;
  regionName: string | null;
  accountStatus?: string;
}

export interface PendingUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  regionId: string | null;
  regionName: string | null;
  registrationRequestedAt: string | null;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  imageUrl: string | null;
  assignedEmployees: number;
  totalVisits: number;
  regionId: string;
  regionName: string;
}

export interface NearbyStore {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  distance: number;
  isWithinRange: boolean;
  regionId: string;
  regionName: string;
}

export interface VisitPhoto {
  id: string;
  photoUrl: string;
  thumbnailUrl: string | null;
  type: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  caption: string | null;
}

export interface ProductEntry {
  id: string;
  brand: string;
  category: string;
  model: string;
  displayType: string;
  quantity: number;
  price: number;
  notes: string | null;
}

export interface Visit {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  storeId: string;
  storeName: string;
  storeAddress: string;
  checkInTime: string;
  checkOutTime: string | null;
  checkInLatitude: number;
  checkInLongitude: number;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  distanceFromStore: number;
  gpsVerified: boolean;
  status: 'InProgress' | 'Completed';
  notes: string | null;
  reviewStatus: string | null;
  reviewedByAdminId: string | null;
  reviewedByAdminName: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  requiresRevisit: boolean | null;
  photos: VisitPhoto[];
  products: ProductEntry[];
}

export interface OverviewStats {
  totalVisits: number;
  completedVisits: number;
  gpsVerified: number;
  activeEmployees: number;
  totalStores: number;
  visitedStores: number;
  totalProducts: number;
}

export interface EmployeeStats {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  totalVisits: number;
  completedVisits: number;
  storesVisited: number;
  lastVisit: string | null;
}

export interface StoreAnalytics {
  id: string;
  name: string;
  city: string;
  regionId: string;
  totalVisits: number;
  gpsVerifiedVisits: number;
  assignedEmployees: number;
  productEntries: number;
  lastVisit: string | null;
}

export interface BrandStats {
  brand: string;
  totalEntries: number;
  totalQuantity: number;
  storeCount: number;
  avgPrice: number;
}

export interface DailyStats {
  date: string;
  totalVisits: number;
  completed: number;
  uniqueEmployees: number;
}

export interface LiveFeedItem {
  visitId: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  storeId: string;
  storeName: string;
  eventType: string;
  timestamp: string;
  gpsVerified: boolean;
  distance: number;
  photoUrl: string | null;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  description: string | null;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  timestamp: string;
  regionId: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface VisitSchedule {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatarUrl: string | null;
  storeId: string;
  storeName: string;
  storeRegionId: string;
  dueDate: string;
  dueTime: string | null;
  status: 'Pending' | 'Completed' | 'Missed' | 'Cancelled';
  actualVisitId: string | null;
  adminNotes: string | null;
  createdByAdminId: string;
  createdByAdminName: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisitComment {
  id: string;
  visitId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  authorRole: 'Admin' | 'Employee';
  createdAt: string;
  isRead: boolean;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  actionUrl: string | null;
  metadataJson: string | null;
}

// Employee Detail types
export interface AssignedStoreInfo {
  id: string;
  name: string;
  address: string;
  regionName: string;
}

export interface EmployeeDetailStats {
  totalVisits: number;
  completedVisits: number;
  missedVisits: number;
  pendingSchedules: number;
  approvedVisits: number;
  rejectedVisits: number;
  lastVisitDate: string | null;
}

export interface EmployeeDetail {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  regionId: string | null;
  regionName: string | null;
  accountStatus: string;
  assignedStores: AssignedStoreInfo[];
  stats: EmployeeDetailStats;
}

export interface EmployeeVisitItem {
  id: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeRegionName: string | null;
  checkInTime: string;
  checkOutTime: string | null;
  status: string;
  reviewStatus: string | null;
  reviewedByAdminName: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  requiresRevisit: boolean | null;
  photosCount: number;
  productsCount: number;
  distanceFromStore: number;
  scheduleId: string | null;
  scheduleDueDate: string | null;
}

export interface EmployeeScheduleItem {
  id: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeRegionName: string | null;
  dueDate: string;
  dueTime: string | null;
  status: string;
  adminNotes: string | null;
  createdByAdminName: string;
  createdAt: string;
  actualVisitId: string | null;
  actualVisitCheckInTime: string | null;
}

// ── Store Detail Types ───────────────────────────────

export interface StoreDetailStats {
  totalVisits: number;
  completedVisits: number;
  inProgressVisits: number;
  approvedVisits: number;
  rejectedVisits: number;
  missedSchedules: number;
  pendingSchedules: number;
  assignedEmployees: number;
  lastVisitDate: string | null;
}

export interface AssignedEmployeeInfo {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  assignedAt: string;
}

export interface StoreDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  imageUrl: string | null;
  regionId: string;
  regionName: string;
  createdAt: string;
  assignedEmployees: AssignedEmployeeInfo[];
  stats: StoreDetailStats;
}

export interface StoreVisitItem {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  checkInTime: string;
  checkOutTime: string | null;
  status: string;
  reviewStatus: string | null;
  reviewedByAdminName: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  requiresRevisit: boolean | null;
  photosCount: number;
  productsCount: number;
  distanceFromStore: number;
  scheduleId: string | null;
  scheduleDueDate: string | null;
}

export interface StoreScheduleItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatarUrl: string | null;
  dueDate: string;
  dueTime: string | null;
  status: string;
  adminNotes: string | null;
  createdByAdminName: string;
  createdAt: string;
  actualVisitId: string | null;
  actualVisitCheckInTime: string | null;
}

// ── New Analytics Types ──────────────────────────────

export interface CompletionRateData {
  overall: {
    scheduled: number;
    completed: number;
    missed: number;
    cancelled: number;
    completionRate: number;
    onTimeRate: number;
  };
  trend: { date: string; scheduled: number; completed: number; missed: number; completionRate: number }[];
  byRegion: { regionId: string; regionName: string; scheduled: number; completed: number; completionRate: number }[] | null;
}

export interface LeaderboardEmployee {
  employeeId: string;
  employeeName: string;
  avatarUrl: string | null;
  regionName: string;
  totalScheduled: number;
  completed: number;
  missed: number;
  approved: number;
  rejected: number;
  completionRate: number;
  approvalRate: number;
  onTimeRate: number;
  avgDurationMinutes: number;
  score: number;
}

export interface EmployeeLeaderboardData {
  employees: LeaderboardEmployee[];
}

export interface StoreFrequencyItem {
  storeId: string;
  storeName: string;
  regionName: string;
  totalVisits: number;
  visitsThisWeek: number;
  visitsThisMonth: number;
  lastVisitDate: string | null;
  lastVisitEmployeeName: string | null;
  daysSinceLastVisit: number;
  frequencyStatus: 'OnSchedule' | 'DueSoon' | 'Overdue' | 'NeverVisited';
}

export interface StoreFrequencyData {
  stores: StoreFrequencyItem[];
}

export interface ApprovalRateData {
  overall: {
    totalReviewed: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    pendingReview: number;
  };
  trend: { date: string; approved: number; rejected: number; approvalRate: number }[];
  byEmployee: { employeeId: string; employeeName: string; approved: number; rejected: number; approvalRate: number }[];
  topRejectionReasons: { reason: string; count: number }[];
}

export interface RegionalComparisonRegion {
  regionId: string;
  regionName: string;
  totalEmployees: number;
  activeEmployees: number;
  totalStores: number;
  scheduledVisits: number;
  completedVisits: number;
  missedVisits: number;
  completionRate: number;
  approvalRate: number;
  avgDurationMinutes: number;
  lastActivityDate: string | null;
}

export interface RegionalComparisonData {
  regions: RegionalComparisonRegion[];
}

export interface MissedPatternsData {
  totalMissed: number;
  byDayOfWeek: { day: string; count: number }[];
  topMissingEmployees: { employeeId: string; employeeName: string; regionName: string; missedCount: number; totalScheduled: number; missRate: number }[];
  topMissedStores: { storeId: string; storeName: string; regionName: string; missedCount: number; totalScheduled: number; missRate: number }[];
  trend: { date: string; missed: number }[];
}

export interface LiveFeedEvent {
  id: string;
  type: 'CheckIn' | 'VisitCompleted' | 'VisitApproved' | 'VisitRejected' | 'ScheduleMissed';
  employeeName: string;
  employeeId: string;
  storeName: string;
  regionName: string;
  timestamp: string;
  message: string;
}

export interface LiveFeedData {
  onlineEmployees: number;
  events: LiveFeedEvent[];
}

// ── Dashboard Types ──────────────────────────────

export interface DashboardSummary {
  adminName: string;
  regionName: string;
  isSuperAdmin: boolean;
  today: {
    scheduledVisits: number;
    completedVisits: number;
    missedVisits: number;
    inProgressVisits: number;
    completionRate: number;
  };
  attentionItems: {
    visitsAwaitingReview: number;
    pendingRegistrations: number;
    employeesWithNoActivityToday: number;
  };
}

export interface DashboardTodayProgress {
  overall: {
    scheduled: number;
    completed: number;
    missed: number;
    inProgress: number;
    remaining: number;
    completionRate: number;
  };
  byRegion: {
    regionId: string;
    regionName: string;
    scheduled: number;
    completed: number;
    missed: number;
    inProgress: number;
    completionRate: number;
  }[] | null;
}

export interface DashboardStoreCoverageItem {
  storeId: string;
  storeName: string;
  regionName: string;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  visitsThisWeek: number;
  coverageStatus: 'Good' | 'Warning' | 'Critical' | 'NeverVisited';
  lastVisitEmployeeName: string | null;
}

export interface DashboardStoreCoverage {
  stores: DashboardStoreCoverageItem[];
}

export interface DashboardPinnedData {
  pinnedWidgets: string[];
}
