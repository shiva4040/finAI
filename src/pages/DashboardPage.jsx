import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { StatCard } from '../components/common/StatCard';
import { GlassCard } from '../components/common/GlassCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { AIInsightCard } from '../components/common/AIInsightCard';
import { AddTransactionModal } from '../components/modals/AddTransactionModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

export const DashboardPage = () => {
  const { user } = useAuth();
  const {
    transactions,
    financialSummary,
    invoiceSummary,
    monthlyCashFlowData,
    expenseCategoryBreakdown,
    currency,
  } = useFinance();

  const navigate = useNavigate();
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const recentTransactions = transactions.slice(0, 5);

  // Custom Recharts Tooltip for glass UI
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 rounded-xl border border-white/10 shadow-xl text-xs">
          <p className="font-semibold text-slate-200 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center gap-2 py-0.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-400 capitalize">{entry.name}:</span>
              <span className="font-mono font-medium text-slate-100">
                {formatCurrency(entry.value, currency)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
            {getGreeting()}, {user?.name || 'Shiva'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Here's your comprehensive financial overview and treasury telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Button
            variant="secondary"
            size="md"
            icon={FileText}
            onClick={() => navigate('/invoices/create')}
          >
            Create Invoice
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setIsAddTxModalOpen(true)}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {/* AI Insight Header Component */}
      <AIInsightCard
        insight="Your operating cash flow velocity is up +14.2% this month. Cloud spend accelerated +18.4%—consider committing to 1-year reserved GPU instances to save ~₹42,000."
        query="Analyze our cloud GPU compute spend and recommend reservation savings."
        actionText="Ask FinAI Copilot"
      />

      {/* Primary Financial Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total Treasury Balance"
          value={formatCurrency(financialSummary.totalBalance, currency)}
          change="+8.4%"
          changeType="positive"
          subtitle="liquid reserves across 3 accounts"
          icon={Wallet}
          accentColor="indigo"
        />
        <StatCard
          title="Total Income"
          value={formatCurrency(financialSummary.totalIncome, currency)}
          change="+12.5%"
          changeType="positive"
          subtitle="current fiscal quarter"
          icon={TrendingUp}
          accentColor="emerald"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(financialSummary.totalExpenses, currency)}
          change="+4.2%"
          changeType="negative"
          subtitle="operational expenditures"
          icon={TrendingDown}
          accentColor="rose"
        />
        <StatCard
          title="Net Cash Flow"
          value={formatCurrency(financialSummary.netCashFlow, currency)}
          change="+18.9%"
          changeType="positive"
          subtitle="net surplus generation"
          icon={Sparkles}
          accentColor="sky"
        />
      </div>

      {/* Middle Row: Income vs Expenses Area Chart & Expense Breakdown Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Chart (2 columns on lg) */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Income vs Expenses Movement
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparison across trailing 7 months of operational flow
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-300">Expenses</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyCashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#incomeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#expenseGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Expense Breakdown Donut */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Expense Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Top budget allocations</p>
            </div>
            <span className="text-xs text-indigo-400 font-medium">This Month</span>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseCategoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expenseCategoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
              <span className="text-xs font-bold font-mono text-slate-100">
                ₹4.58L
              </span>
            </div>
          </div>

          <div className="space-y-2 mt-2 pt-2 border-t border-white/10 max-h-36 overflow-y-auto">
            {expenseCategoryBreakdown.slice(0, 4).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-300 truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-400">{cat.percentage}%</span>
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(cat.value, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Invoice Status Snapshot & Monthly Cash Flow Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Status Card */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Invoice Status</h3>
              <p className="text-xs text-slate-400 mt-0.5">Accounts Receivable pipeline</p>
            </div>
            <NavLink
              to="/invoices"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
            >
              All Invoices
              <ArrowRight className="w-3 h-3" />
            </NavLink>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-xl glass-subtle border border-emerald-500/20 bg-emerald-500/[0.03]">
              <div className="flex items-center gap-1 text-emerald-400 mb-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Paid</span>
              </div>
              <p className="text-sm font-bold font-mono text-slate-100">
                {formatCurrency(invoiceSummary.paid, currency)}
              </p>
            </div>

            <div className="p-3 rounded-xl glass-subtle border border-amber-500/20 bg-amber-500/[0.03]">
              <div className="flex items-center gap-1 text-amber-400 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Pending</span>
              </div>
              <p className="text-sm font-bold font-mono text-slate-100">
                {formatCurrency(invoiceSummary.pending, currency)}
              </p>
            </div>

            <div className="p-3 rounded-xl glass-subtle border border-rose-500/20 bg-rose-500/[0.03]">
              <div className="flex items-center gap-1 text-rose-400 mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Overdue</span>
              </div>
              <p className="text-sm font-bold font-mono text-rose-300">
                {formatCurrency(invoiceSummary.overdue, currency)}
              </p>
            </div>
          </div>

          {/* Quick Invoice AI insight */}
          <div className="p-3.5 rounded-xl glass-panel border border-amber-500/30 bg-amber-500/[0.04] text-xs">
            <div className="flex items-center justify-between text-amber-400 font-semibold mb-1">
              <span>Collection Health Alert</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20">Attention</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              Invoice #INV-2026-0042 (Acme Technologies) of ₹88,500.00 is 4 days overdue. Automated reminders were queued.
            </p>
          </div>
        </GlassCard>

        {/* Monthly Cash Flow Movement Chart (2 columns on lg) */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Monthly Net Cash Flow</h3>
              <p className="text-xs text-slate-400 mt-0.5">Net capital added to company treasury</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              +₹1.65L this month
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="netFlow"
                  name="Net Cash Flow"
                  fill="#6366F1"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Recent Transactions Table */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Recent Transactions</h3>
            <p className="text-xs text-slate-400 mt-0.5">Real-time ledger updates across all bank accounts</p>
          </div>
          <NavLink
            to="/transactions"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            View All Ledger Entries
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3 px-3">Transaction</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === 'Income';
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    onClick={() => navigate('/transactions')}
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {isIncome ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200 group-hover:text-white transition-colors truncate max-w-xs">
                            {tx.description}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {tx.reference || tx.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">{tx.category}</td>
                    <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="py-3.5 px-3 text-slate-300">{tx.paymentMethod}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-semibold whitespace-nowrap">
                      <span className={isIncome ? 'text-emerald-400' : 'text-slate-100'}>
                        {isIncome ? '+' : '−'}
                        {formatCurrency(tx.amount, currency)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Badge
                        variant={tx.status === 'Completed' ? 'income' : 'warning'}
                        size="sm"
                      >
                        {tx.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddTxModalOpen}
        onClose={() => setIsAddTxModalOpen(false)}
      />
    </div>
  );
};
