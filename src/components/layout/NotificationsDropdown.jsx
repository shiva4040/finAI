import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import { formatRelativeTime } from '../../utils/formatters';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  CheckCheck,
  ChevronRight,
} from 'lucide-react';

export const NotificationsDropdown = ({ isOpen, onClose }) => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useFinance();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

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

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50 animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-slate-100">Notifications</h4>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No notifications yet
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-white/5 transition-colors ${
                !notif.read ? 'bg-indigo-500/[0.04]' : ''
              }`}
            >
              <div className="mt-0.5 p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h5
                    className={`text-xs font-semibold truncate ${
                      !notif.read ? 'text-slate-100' : 'text-slate-300'
                    }`}
                  >
                    {notif.title}
                  </h5>
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {notif.message}
                </p>
                <span className="text-[10px] text-slate-500 mt-1.5 block">
                  {formatRelativeTime(notif.timestamp)}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 mt-1 shrink-0" />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/10 bg-slate-900/30 text-center">
        <button
          onClick={() => {
            navigate('/settings/notifications');
            onClose();
          }}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Manage notification preferences
        </button>
      </div>
    </div>
  );
};
