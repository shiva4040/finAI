import React from 'react';
import { GlassCard } from './GlassCard';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  change,
  changeType = 'positive', // 'positive' | 'negative' | 'neutral'
  subtitle,
  icon: Icon,
  trendLabel = 'vs last month',
  accentColor = 'indigo', // 'emerald', 'rose', 'indigo', 'amber'
  className = '',
}) => {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';

  const iconColors = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  };

  return (
    <GlassCard className={`relative overflow-hidden group ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-2 font-sans">
            {value}
          </h3>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border ${iconColors[accentColor] || iconColors.indigo} transition-transform duration-300 group-hover:scale-105`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(change || subtitle) && (
        <div className="mt-4 flex items-center gap-2 text-xs flex-wrap">
          {change && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold px-2 py-0.5 rounded-md ${
                isPositive
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : isNegative
                  ? 'text-rose-400 bg-rose-500/10'
                  : 'text-slate-400 bg-slate-500/10'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : isNegative ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : null}
              {change}
            </span>
          )}
          <span className="text-slate-400">
            {subtitle || trendLabel}
          </span>
        </div>
      )}
    </GlassCard>
  );
};
