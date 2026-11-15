import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { AddIncomeModal } from '../components/modals/AddIncomeModal';
import { ImportCSVModal } from '../components/modals/ImportCSVModal';
import { AIInsightCard } from '../components/common/AIInsightCard';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  TrendingUp,
  Plus,
  Upload,
  Edit2,
  Trash2,
  Layers,
  ArrowUpRight,
  PieChart as PieIcon,
  Search,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const IncomePage = () => {
  const { transactions, financialSummary, deleteTransaction, monthlyCashFlowData, currency } = useFinance();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Income items only
  const incomeList = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'Income' &&
        (searchTerm === '' ||
          t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [transactions, searchTerm]);

  const handleDeleteConfirm = () => {
    if (deletingId) {
      deleteTransaction(deletingId);
      showToast({
        title: 'Income Entry Removed',
        message: 'The income entry was deleted successfully.',
        type: 'info',
      });
      setDeletingId(null);
    }
  };

  const chartData = monthlyCashFlowData.map((d) => ({
    month: d.month,
    income: d.income,
  }));

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
            Revenue & Income Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track enterprise client retainers, SaaS licenses, consulting fees, and yield
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Button
            variant="outline"
            size="md"
            icon={Upload}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import CSV
          </Button>
          <Button
            variant="success"
            size="md"
            icon={Plus}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Income Entry
          </Button>
        </div>
      </div>

      {/* AI Insight */}
      <AIInsightCard
        insight="Enterprise Licensing accounts for 46.4% of your total revenue. Client retainers increased +12.5% compared to the prior quarter."
        query="Provide a breakdown of our revenue sources and growth trajectory."
        actionText="Ask FinAI"
      />

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          title="Total Lifetime Income"
          value={formatCurrency(financialSummary.totalIncome, currency)}
          change="+14.2%"
          changeType="positive"
          subtitle="across all client contracts"
          icon={TrendingUp}
          accentColor="emerald"
        />
        <StatCard
          title="Income This Month"
          value={formatCurrency(financialSummary.thisMonthIncome, currency)}
          change="+8.9%"
          changeType="positive"
          subtitle="September 2026 recognized"
          icon={ArrowUpRight}
          accentColor="emerald"
        />
        <StatCard
          title="Average Monthly Revenue"
          value={formatCurrency(financialSummary.avgMonthlyIncome, currency)}
          change="+11.0%"
          changeType="positive"
          subtitle="trailing 3-month run rate"
          icon={Layers}
          accentColor="indigo"
        />
      </div>

      {/* Income Trend Area Chart */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Income Velocity & Trend</h3>
            <p className="text-xs text-slate-400 mt-0.5">Monthly recognized inflow</p>
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            Strong Upward Trajectory
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeOnlyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val / 1000}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="glass-panel p-3 rounded-xl border border-white/10 shadow-xl text-xs">
                        <p className="font-semibold text-slate-200 mb-1">{label}</p>
                        <p className="text-emerald-400 font-mono font-bold">
                          {formatCurrency(payload[0].value, currency)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#incomeOnlyGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Income Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Income Ledger</h3>
            <p className="text-xs text-slate-400 mt-0.5">Individual revenue transactions</p>
          </div>
          <div className="w-full sm:w-64">
            <Input
              icon={Search}
              placeholder="Filter income records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {incomeList.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No income records found"
            description="Record incoming payments or client contracts to populate this table."
            actionText="Add Income Entry"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {incomeList.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200 group-hover:text-white max-w-xs min-w-0 truncate">
                      {item.description}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{item.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      +{formatCurrency(item.amount, currency)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Add / Edit Income Modal */}
      <AddIncomeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {editingItem && (
        <AddIncomeModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          editItem={editingItem}
        />
      )}

      {/* Import CSV Modal */}
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Income Entry"
        message="Are you sure you want to remove this income entry? Your recorded cash flow and earnings metrics will update accordingly."
        confirmText="Delete Entry"
      />
    </div>
  );
};
