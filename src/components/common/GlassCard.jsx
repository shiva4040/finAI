import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const GlassCard = ({ children, className = '', glow = false, onClick, ...props }) => {
  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          'glass-panel rounded-2xl p-6 transition-all duration-200',
          glow && 'hover:shadow-glass-glow',
          onClick && 'cursor-pointer hover:border-indigo-500/30',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
