import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidth} glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl z-10 animate-fade-in flex flex-col overflow-hidden m-auto`}
        style={{ maxHeight: 'min(calc(100dvh - 32px), 880px)' }}
      >
        {/* Pinned Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-white/10 shrink-0 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md">
            <div className="pr-4 min-w-0">
              {title && (
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4">
          {children}
        </div>

        {/* Pinned Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-white/10 shrink-0 bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
