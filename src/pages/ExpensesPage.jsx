import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { AddExpenseModal } from '../components/modals/AddExpenseModal';
import { ImportCSVModal } from '../components/modals/ImportCSVModal';
import { AIInsightCard } from '../components/common/AIInsightCard';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  TrendingDown,
  Plus,
  Upload,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Flame,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ExpensesPage = () => {
  const {
    transactions,
    financialSummary,
    deleteTransaction,
    monthlyCashFlowData,
    expenseCategoryBreakdown,
    currency,
  } = useFinance();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter expenses only
  const expenseList = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'Expense' &&
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
        title: 'Expense Record Deleted',
        message: 'The expense has been removed from ledger.',
        type: 'info',
      });
      setDeletingId(null);
    }
  };

  const chartData = monthlyCashFlowData.map((d) => ({
    month: d.month,
    expenses: d.expenses,
  }));

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
            Expense Management & Burn Rate
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time audit of operational expenditures, vendor disbursements, and cloud costs
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
            variant="danger"
            size="md"
            icon={Plus}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Expense
          </Button>
        </div>
      </div>

      {/* AI Insight */}
      <AIInsightCard
        insight="Cloud & Tech represents 17.7% of total spending. A recent spike in AWS compute (+18.4%) accounts for the largest non-payroll variance."
        query="Where are our biggest expenses and how can we reduce operational burn?"
        actionText="Ask FinAI"
      />

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total Expenses"
          value={formatCurrency(financialSummary.totalExpenses, currency)}
          change="+4.2%"
          changeType="negative"
          subtitle="lifetime operational burn"
          icon={TrendingDown}
          accentColor="rose"
        />
        <StatCard
          title="This Month's Burn"
          value={formatCurrency(financialSummary.thisMonthExpenses, currency)}
          change="+6.8%"
          changeType="negative"
          subtitle="September 2026 total"
          icon={Calendar}
          accentColor="rose"
        />
        <StatCard
          title="Average Monthly Expense"
          value={formatCurrency(financialSummary.avgMonthlyExpense, currency)}
          change="-1.2%"
          changeType="positive"
          subtitle="trailing 3 months average"
          icon={Layers}
          accentColor="indigo"
        />
        <StatCard
          title="Largest Single Expense"
          value={formatCurrency(financialSummary.largestExpense, currency)}
          change="Fortnightly"
          changeType="neutral"
          subtitle="Payroll & Engineering"
          icon={Flame}
          accentColor="amber"
        />
      </div>

      {/* Charts Row: Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Operational Burn Rate</h3>
              <p className="text-xs text-slate-400 mt-0.5">Trailing 7-month disbursement history</p>
            </div>
            <span className="text-xs font-mono text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
              Controlled Variance
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="expenseOnlyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
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
                          <p className="text-rose-400 font-mono font-bold">
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
                  dataKey="expenses"
                  stroke="#F43F5E"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#expenseOnlyGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Category Breakdown Donut */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Category Allocations</h3>
              <p className="text-xs text-slate-400 mt-0.5">Budget percentages</p>
            </div>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseCategoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expenseCategoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass-panel p-2.5 rounded-xl border border-white/10 shadow-xl text-xs">
                          <p className="font-medium text-slate-200">{payload[0].name}</p>
                          <p className="font-mono font-bold text-slate-100">
                            {formatCurrency(payload[0].value, currency)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 mt-2 pt-2 border-t border-white/10 max-h-36 overflow-y-auto">
            {expenseCategoryBreakdown.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-300 truncate">{cat.name}</span>
                </div>
                <span className="font-mono font-semibold text-slate-300 shrink-0">
                  {formatCurrency(cat.value, currency)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Expenses Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Expense Ledger Entries</h3>
            <p className="text-xs text-slate-400 mt-0.5">Itemized debit transactions</p>
          </div>
          <div className="w-full sm:w-64">
            <Input
              icon={Search}
              placeholder="Search expenses, vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {expenseList.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="No expenses recorded"
            description="Log business expenses to maintain an accurate ledger and cash burn metrics."
            actionText="Add Expense"
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
                {expenseList.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-3 px-4 max-w-xs min-w-0">
                      <p className="font-semibold text-slate-200 group-hover:text-white truncate">
                        {item.description}
                      </p>
                      {item.entityName && (
                        <span className="text-[10px] text-slate-500 block truncate">Payee: {item.entityName}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{item.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                      −{formatCurrency(item.amount, currency)}
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

      {/* Add / Edit Expense Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {editingItem && (
        <AddExpenseModal
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
        title="Delete Expense Entry"
        message="Are you sure you want to remove this expense record from your ledger? Ledger reconciliation balances will adjust automatically."
        confirmText="Delete Expense"
      />
    </div>
  );
};
