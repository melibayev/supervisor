import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/auth/LoginPage';
import EmployeeDashboard from '@/pages/employee/Dashboard';
import MyStores from '@/pages/employee/MyStores';
import StoreDetail from '@/pages/employee/StoreDetail';
import ActiveVisit from '@/pages/employee/ActiveVisit';
import VisitHistory from '@/pages/employee/VisitHistory';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminEmployees from '@/pages/admin/AdminEmployees';
import AdminStores from '@/pages/admin/AdminStores';
import AdminAssignments from '@/pages/admin/AdminAssignments';
import AdminVisits from '@/pages/admin/AdminVisits';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminAudit from '@/pages/admin/AdminAudit';
import AdminSchedules from '@/pages/admin/AdminSchedules';
import EmployeeDetailPage from '@/pages/admin/EmployeeDetailPage';
import StoreDetailPage from '@/pages/admin/StoreDetailPage';
import NotificationsPage from '@/pages/NotificationsPage';
import MySchedules from '@/pages/employee/MySchedules';
import RegisterPage from '@/pages/auth/RegisterPage';
import SettingsPage from '@/pages/SettingsPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'Employee' ? '/dashboard' : '/admin'} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { initialize, isLoading, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">LG</span>
          </div>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to={user?.role === 'Employee' ? '/dashboard' : '/admin'} replace /> : <LoginPage />
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to={user?.role === 'Employee' ? '/dashboard' : '/admin'} replace /> : <RegisterPage />
      } />

      {/* Employee routes */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<ProtectedRoute roles={['Employee']}><EmployeeDashboard /></ProtectedRoute>} />
        <Route path="/stores" element={<ProtectedRoute roles={['Employee']}><MyStores /></ProtectedRoute>} />
        <Route path="/store/:id" element={<ProtectedRoute roles={['Employee']}><StoreDetail /></ProtectedRoute>} />
        <Route path="/visit/:id" element={<ActiveVisit />} />
        <Route path="/history" element={<ProtectedRoute roles={['Employee']}><VisitHistory /></ProtectedRoute>} />
        <Route path="/schedules" element={<ProtectedRoute roles={['Employee']}><MySchedules /></ProtectedRoute>} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<Navigate to="/settings" replace />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/employees" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><AdminEmployees /></ProtectedRoute>} />
        <Route path="/admin/employees/:employeeId" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><EmployeeDetailPage /></ProtectedRoute>} />
        <Route path="/admin/stores" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><AdminStores /></ProtectedRoute>} />
        <Route path="/admin/stores/:storeId" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><StoreDetailPage /></ProtectedRoute>} />
        <Route path="/admin/assignments" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><AdminAssignments /></ProtectedRoute>} />
        <Route path="/admin/visits" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><AdminVisits /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><AdminAnalytics /></ProtectedRoute>} />
        <Route path="/admin/audit" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><AdminAudit /></ProtectedRoute>} />
        <Route path="/admin/schedules" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><AdminSchedules /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? (user?.role === 'Employee' ? '/dashboard' : '/admin') : '/login'} replace />} />
    </Routes>
  );
}
