import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const recentToastsRef = useRef(new Set());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ title, message, type = 'success', duration = 4000, action = null }) => {
    const key = `${type}-${title}-${message}`;
    if (recentToastsRef.current.has(key)) {
      return; // Deduplicate rapid repeated calls
    }
    recentToastsRef.current.add(key);
    setTimeout(() => {
      recentToastsRef.current.delete(key);
    }, 1500);

    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast = { id, title, message, type, duration, action };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Render Container: Solid, High-Contrast, Pinned at Bottom-Right */}
      <div className="fixed bottom-5 right-5 z-[10000] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((toast) => {
          const config = {
            success: {
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
              border: 'border-emerald-500/80',
              badgeBg: 'bg-emerald-500/20 text-emerald-400',
              titleColor: 'text-emerald-300',
            },
            error: {
              icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
              border: 'border-rose-500/80',
              badgeBg: 'bg-rose-500/20 text-rose-400',
              titleColor: 'text-rose-300',
            },
            warning: {
              icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
              border: 'border-amber-500/80',
              badgeBg: 'bg-amber-500/20 text-amber-400',
              titleColor: 'text-amber-300',
            },
            info: {
              icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
              border: 'border-sky-500/80',
              badgeBg: 'bg-sky-500/20 text-sky-400',
              titleColor: 'text-sky-300',
            },
          };

          const cur = config[toast.type] || config.info;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900 border-2 ${cur.border} shadow-2xl animate-fade-in transition-all text-slate-100`}
            >
              <div className={`p-2 rounded-xl ${cur.badgeBg} shrink-0 mt-0.5`}>
                {cur.icon}
              </div>

              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${cur.titleColor}`}>
                    {toast.title}
                  </h4>
                )}
                {toast.message && (
                  <p className="text-xs sm:text-sm font-medium text-slate-200 mt-0.5 leading-relaxed break-words">
                    {toast.message}
                  </p>
                )}
                {toast.action && (
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        toast.action.onClick?.();
                        removeToast(toast.id);
                      }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors underline"
                    >
                      {toast.action.label}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-slate-800"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
