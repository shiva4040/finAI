import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFinance } from '../../context/FinanceContext';
import { NotificationsDropdown } from './NotificationsDropdown';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  Plus,
  Sparkles,
  Receipt,
  FileText,
  UserPlus,
} from 'lucide-react';

export const Navbar = ({ onToggleMobile }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications } = useFinance();
  const navigate = useNavigate();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Keyboard shortcut Cmd/Ctrl + K for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6 lg:px-8 py-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger & Global Search Trigger */}
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <button
              onClick={onToggleMobile}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Omnisearch trigger button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full max-w-md flex items-center justify-between px-3.5 py-2 rounded-xl glass-input text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:border-indigo-500/40 transition-all text-xs group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="truncate">Search transactions, invoices, entities...</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-300/60 dark:border-white/10 shrink-0">
                <span>⌘</span>K
              </div>
            </button>
          </div>

          {/* Right: Quick actions, notifications, theme toggle, profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Quick "+ New" Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>

              {isNewMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNewMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 glass-panel rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl p-1.5 z-50 animate-fade-in text-xs bg-white dark:bg-slate-900">
                    <button
                      onClick={() => {
                        navigate('/transactions', { state: { openAddModal: true } });
                        setIsNewMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <Receipt className="w-4 h-4 text-emerald-500" />
                      <span>Add Transaction</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/invoices/create');
                        setIsNewMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <FileText className="w-4 h-4 text-sky-500" />
                      <span>Create Invoice</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/customers', { state: { openAddModal: true } });
                        setIsNewMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <UserPlus className="w-4 h-4 text-indigo-500" />
                      <span>Add Customer</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* AI Assistant Quick Pill */}
            <NavLink
              to="/ai-assistant"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold glass-subtle hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
              <span>FinAI Copilot</span>
            </NavLink>

            {/* Dark / Light Mode Switch */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Notifications Menu Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              <NotificationsDropdown
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
              />
            </div>

            {/* User Profile Avatar */}
            <NavLink
              to="/settings/profile"
              className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10 group"
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10 group-hover:ring-indigo-400 transition-all"
              />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Global Omnisearch Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};
