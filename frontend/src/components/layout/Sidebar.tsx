import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import {
  LayoutDashboard, BarChart3, Users, Store, MapPin, History,
  Camera, Download, Settings, ChevronLeft, ChevronRight, LogOut, Link as LinkIcon,
  Calendar, Bell, ScrollText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const adminSections = (t: (k: any) => string) => [
  {
    label: t('nav.overview'),
    items: [
      { to: '/admin', label: t('nav.dashboard'), icon: LayoutDashboard },
      { to: '/admin/analytics', label: t('nav.analytics'), icon: BarChart3 },
      { to: '/admin/employees', label: t('nav.employees'), icon: Users },
      { to: '/admin/stores', label: t('nav.stores'), icon: Store },
      { to: '/admin/assignments', label: t('nav.assign'), icon: LinkIcon },
    ],
  },
  {
    label: t('nav.reports'),
    items: [
      { to: '/admin/visits', label: t('nav.visits'), icon: MapPin },
      { to: '/admin/schedules', label: t('nav.schedules'), icon: Calendar },
      { to: '/admin/audit', label: t('nav.auditLogs'), icon: ScrollText },
    ],
  },
  {
    label: t('nav.apps'),
    items: [
      { to: '/notifications', label: t('nav.notifications'), icon: Bell },
      { to: '/settings', label: t('nav.settings'), icon: Settings },
    ],
  },
];

const employeeSections = (t: (k: any) => string) => [
  {
    label: t('nav.menu'),
    items: [
      { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
      { to: '/stores', label: t('nav.myStores'), icon: MapPin },
      { to: '/schedules', label: t('nav.mySchedule'), icon: Calendar },
      { to: '/history', label: t('nav.visitHistory'), icon: History },
      { to: '/notifications', label: t('nav.notifications'), icon: Bell },
      { to: '/settings', label: t('nav.settings'), icon: Settings },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const { t } = useTranslation();

  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  const { data: pendingCountData } = useQuery({
    queryKey: ['pending-users-count'],
    queryFn: () => api.getPendingCount(),
    refetchInterval: 30000,
    enabled: isAdmin,
  });
  const pendingCount = pendingCountData?.count ?? 0;

  const { data: unreviewedData } = useQuery({
    queryKey: ['unreviewed-visits-count'],
    queryFn: () => api.getUnreviewedCount(),
    refetchInterval: 30000,
    enabled: isAdmin,
  });
  const unreviewedCount = unreviewedData?.count ?? 0;

  const { data: unreadNotiData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.getUnreadNotificationCount(),
    refetchInterval: 30000,
  });
  const unreadNotiCount = unreadNotiData?.count ?? 0;

  if (!user) return null;

  const sections = isAdmin ? adminSections(t) : employeeSections(t);
  const initials = user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const isActive = (to: string) => {
    if (to === '/admin' || to === '/dashboard') return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 lg:relative',
          collapsed ? 'w-[68px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center gap-3 px-5 h-16 border-b border-slate-100 dark:border-slate-800 flex-shrink-0', collapsed && 'justify-center px-0')}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">LG</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">LG Supervisor</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Dashboard</div>
            </div>
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-4 no-scrollbar">
          {sections.map(section => (
            <div key={section.label} className="mb-4">
              {!collapsed && (
                <div className="px-5 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5 px-3">
                {section.items
                  .filter(item => !('superAdminOnly' in item && item.superAdminOnly && user.role !== 'SuperAdmin'))
                  .map(item => {
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onMobileClose}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 relative',
                          collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                          active
                            ? 'bg-primary/10 text-primary dark:text-primary-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:bg-primary before:rounded-r-full'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        )}
                      >
                        <item.icon className={cn('h-[18px] w-[18px] flex-shrink-0', active && 'text-primary')} />
                        {!collapsed && <span>{item.label}</span>}
                        {!collapsed && item.to === '/admin/employees' && pendingCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 bg-red-500 text-white">
                            {pendingCount > 99 ? '99+' : pendingCount}
                          </span>
                        )}
                        {collapsed && item.to === '/admin/employees' && pendingCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                        )}
                        {!collapsed && item.to === '/admin/visits' && unreviewedCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 bg-red-500 text-white">
                            {unreviewedCount > 99 ? '99+' : unreviewedCount}
                          </span>
                        )}
                        {collapsed && item.to === '/admin/visits' && unreviewedCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                        )}
                        {!collapsed && item.to === '/notifications' && unreadNotiCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 bg-red-500 text-white">
                            {unreadNotiCount > 99 ? '99+' : unreadNotiCount}
                          </span>
                        )}
                        {collapsed && item.to === '/notifications' && unreadNotiCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden lg:flex justify-center py-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* User card */}
        <div className={cn('border-t border-slate-100 dark:border-slate-800 p-3 flex-shrink-0', collapsed && 'flex justify-center')}>
          {collapsed ? (
            <button onClick={handleLogout} title="Sign out" className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {initials}
            </button>
          ) : (
            <div className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.fullName}</div>
                <div className="text-[11px] text-slate-400 truncate">{user.role}</div>
              </div>
              <button onClick={handleLogout} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
