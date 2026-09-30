import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AIInsightCard = ({
  insight,
  query,
  contextLabel = 'FINAI INTELLIGENCE',
  className = '',
  actionText = 'Ask FinAI',
  compact = false,
}) => {
  const navigate = useNavigate();

  const handleAsk = () => {
    navigate('/ai-assistant', {
      state: { preloadedQuery: query || insight },
    });
  };

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between gap-3 p-3.5 rounded-xl glass-panel border border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-500/[0.03] ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 truncate">{insight}</p>
        </div>
        <button
          onClick={handleAsk}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 shrink-0 transition-colors"
        >
          {actionText}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 glass-panel border border-indigo-500/25 bg-gradient-to-r from-indigo-50/80 via-white/90 to-indigo-50/40 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-slate-900/20 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 shadow-sm shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {contextLabel}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-1 leading-relaxed">
              {insight}
            </p>
          </div>
        </div>

        <button
          onClick={handleAsk}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/40 shadow-md shadow-indigo-600/20 transition-all hover:gap-2.5 self-start sm:self-auto shrink-0"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
