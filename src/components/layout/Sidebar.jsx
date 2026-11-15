import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  Building2,
  BarChart3,
  Bot,
  Settings,
  LogOut,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';

export const Sidebar = ({ mobileOpen, setMobileOpen, collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const { invoiceSummary } = useFinance();
  const navigate = useNavigate();

  // Prevent background scrolling and handle ESC when mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen, setMobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', path: '/transactions', icon: Receipt },
    { label: 'Income', path: '/income', icon: TrendingUp },
    { label: 'Expenses', path: '/expenses', icon: TrendingDown },
    {
      label: 'Invoices',
      path: '/invoices',
      icon: FileText,
      badge: invoiceSummary.overdueCount > 0 ? `${invoiceSummary.overdueCount}` : null,
      badgeType: 'overdue',
    },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Vendors', path: '/vendors', icon: Building2 },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    {
      label: 'AI Assistant',
      path: '/ai-assistant',
      icon: Bot,
      badge: 'PRO',
      badgeType: 'ai',
      glow: true,
    },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
        <NavLink to="/dashboard" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-indigo-100" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-100 font-sans">
                Fin<span className="text-indigo-400">AI</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                v2.6
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">
              Financial Intelligence
            </p>
          </div>
        </NavLink>

        {/* Mobile close button */}
        {setMobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Core Operating System
        </div>
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen && setMobileOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-white bg-indigo-600/20 border border-indigo-500/40 shadow-sm shadow-indigo-500/10 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        item.badgeType === 'overdue'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom User Profile Section */}
      <div className="p-4 border-t border-white/10 bg-slate-900/40 shrink-0">
        <div className="flex items-center justify-between p-2 rounded-xl glass-subtle">
          <NavLink
            to="/settings/profile"
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className="flex items-center gap-3 min-w-0 group"
          >
            <div className="relative">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                alt={user?.name || 'User'}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/20"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-400 transition-colors">
                {user?.fullName || user?.name || 'Shiva'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.role || 'CFO'}
              </p>
            </div>
          </NavLink>

          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 glass-panel border-r border-white/10 z-30 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 glass-panel border-r border-white/10 z-50 animate-fade-in shadow-2xl flex flex-col bg-slate-900">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
