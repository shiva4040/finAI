import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Badge = ({ children, variant = 'neutral', size = 'md', className = '' }) => {
  const variantStyles = {
    income: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    expense: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20',
    purple: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20',
    neutral: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20',
    paid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    overdue: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    draft: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20',
    cancelled: 'bg-slate-500/10 text-slate-600 dark:text-slate-500 border border-slate-500/20',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-md font-medium',
    md: 'text-xs px-2.5 py-1 rounded-lg font-medium',
    lg: 'text-sm px-3 py-1.5 rounded-lg font-semibold',
  };

  const chosenVariant = variantStyles[variant.toLowerCase()] || variantStyles.neutral;

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 tracking-wide shrink-0 transition-colors',
          chosenVariant,
          sizeStyles[size],
          className
        )
      )}
    >
      {children}
    </span>
  );
};
