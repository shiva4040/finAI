import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import { formatRelativeTime } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  CheckCheck,
  ChevronRight,
  Trash2,
  X,
  TrendingUp,
  TrendingDown,
  FileText,
  DollarSign,
  Upload,
} from 'lucide-react';

export const NotificationsDropdown = ({ isOpen, onClose }) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
  } = useFinance();

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNotificationClick = (notif) => {
    markNotificationRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      onClose();
    }
  };

  const handleDeleteItem = (e, notifId) => {
    e.stopPropagation();
    deleteNotification(notifId);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'income_created':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'expense_created':
        return <TrendingDown className="w-4 h-4 text-rose-400" />;
      case 'invoice_created':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'payment_received':
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'csv_import':
        return <Upload className="w-4 h-4 text-sky-400" />;
      case 'invoice_overdue':
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read).length;

  return (
    <>
      <div
        ref={dropdownRef}
        className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden z-50 animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-semibold text-slate-100">Notifications</h4>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Read All
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors ml-1"
                title="Clear all notifications"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No notifications in your inbox.
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = !notif.is_read && !notif.read;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group p-3.5 flex items-start gap-3 cursor-pointer hover:bg-slate-800/40 transition-colors ${
                    isUnread ? 'bg-indigo-500/[0.06]' : ''
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h5
                        className={`text-xs font-semibold truncate ${
                          isUnread ? 'text-slate-100' : 'text-slate-300'
                        }`}
                      >
                        {notif.title}
                      </h5>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        )}
                        <button
                          onClick={(e) => handleDeleteItem(e, notif.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 transition-opacity"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">
                      {formatRelativeTime(notif.created_at || notif.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/80 text-center">
          <button
            onClick={() => {
              navigate('/settings');
              onClose();
            }}
            className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            Manage notification preferences
          </button>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          clearAllNotifications();
          setShowClearConfirm(false);
        }}
        title="Clear All Notifications"
        message="Are you sure you want to clear all notification records from your account? This action cannot be undone."
        confirmText="Clear All"
        type="danger"
      />
    </>
  );
};
