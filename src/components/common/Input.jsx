import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Input = ({
  label,
  error,
  icon: Icon,
  prefix,
  suffix,
  className = '',
  id,
  type = 'text',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        {prefix && (
          <span className="absolute left-3.5 text-slate-400 font-mono text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          className={twMerge(
            clsx(
              'w-full glass-input rounded-xl px-3.5 py-2.5 text-sm transition-all placeholder:text-slate-500',
              Icon && 'pl-10',
              prefix && 'pl-9',
              suffix && 'pr-9',
              error && 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20',
              className
            )
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 text-slate-400 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
};

export const Select = ({
  label,
  error,
  options = [],
  className = '',
  id,
  children,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-medium text-slate-400 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={twMerge(
            clsx(
              'w-full glass-input rounded-xl px-3.5 py-2.5 text-sm transition-all appearance-none cursor-pointer',
              'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10',
              error && 'border-rose-500/60 focus:border-rose-500',
              className
            )
          )}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
                  {opt.label}
                </option>
              ))
            : children}
        </select>
      </div>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
};
