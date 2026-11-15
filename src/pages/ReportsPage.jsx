import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Input';
import { AIInsightCard } from '../components/common/AIInsightCard';
import { formatCurrency } from '../utils/formatters';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const ReportsPage = () => {
  const {
    financialSummary,
    invoiceSummary,
    monthlyCashFlowData,
    expenseCategoryBreakdown,
    incomeCategoryBreakdown,
    currency,
  } = useFinance();
  const { showToast } = useToast();

  const [dateRange, setDateRange] = useState('q3-2026');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const invoiceAnalyticsData = [
    { name: 'Paid Invoices', value: invoiceSummary.paid, color: '#10B981' },
    { name: 'Pending Balance', value: invoiceSummary.pending, color: '#F59E0B' },
    { name: 'Overdue Balance', value: invoiceSummary.overdue, color: '#F43F5E' },
  ];

  const handleExportCSV = () => {
    showToast({
      title: 'Report Generated',
      message: 'Comprehensive financial report exported to FinAI_Report_Q3_2026.csv',
      type: 'success',
    });
  };

  const handleExportPDF = () => {
    showToast({
      title: 'PDF Generation',
      message: 'Compiling financial audit presentation for print/export...',
      type: 'info',
    });
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
            Financial Intelligence & Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Executive boardroom-grade treasury telemetry, burn analysis, and cash flow projections
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            size="md"
            icon={Download}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={FileSpreadsheet}
            onClick={handleExportPDF}
          >
            Export Audit PDF
          </Button>
        </div>
      </div>

      {/* AI Insight */}
      <AIInsightCard
        insight="Operating margins expanded +5.2% over Q3. Projected cash runway at current burn rate of ₹4.58L/mo is 18.2 months with current reserves."
        query="Generate a full financial runway projection and scenario sensitivity analysis."
        actionText="Ask FinAI"
      />

      {/* Controls & Filter Bar */}
      <GlassCard className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <Select
              label="Reporting Timeframe"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: 'q3-2026', label: 'Q3 2026 (Jul - Sep)' },
                { value: 'q2-2026', label: 'Q2 2026 (Apr - Jun)' },
                { value: 'h1-2026', label: 'H1 2026 (Jan - Jun)' },
                { value: 'trailing-12', label: 'Trailing 12 Months' },
                { value: 'all-time', label: 'All Time Fiscal Year' },
              ]}
            />
          </div>

          <div>
            <Select
              label="Fiscal Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={[
                { value: '2026', label: 'FY 2026 - 2027' },
                { value: '2025', label: 'FY 2025 - 2026' },
              ]}
            />
          </div>

          <div>
            <Select
              label="Department Scope"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Company Departments' },
                { value: 'Engineering', label: 'Engineering & Cloud' },
                { value: 'Operations', label: 'Operations & Legal' },
                { value: 'Sales', label: 'Sales & Marketing' },
              ]}
            />
          </div>
        </div>
      </GlassCard>

      {/* 1. Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          title="Period Gross Income"
          value={formatCurrency(financialSummary.totalIncome, currency)}
          change="+12.5%"
          changeType="positive"
          subtitle="recognized inflows"
          icon={TrendingUp}
          accentColor="emerald"
        />
        <StatCard
          title="Period Gross Expenses"
          value={formatCurrency(financialSummary.totalExpenses, currency)}
          change="+4.2%"
          changeType="negative"
          subtitle="operating disbursements"
          icon={TrendingDown}
          accentColor="rose"
        />
        <StatCard
          title="Net Cash Generated"
          value={formatCurrency(financialSummary.netCashFlow, currency)}
          change="+18.9%"
          changeType="positive"
          subtitle="net treasury accretion"
          icon={BarChart3}
          accentColor="indigo"
        />
      </div>

      {/* 2 & 3. Income & Expense Monthly Comparison */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Monthly Inflow vs Outflow Comparison
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical monthly velocity and net liquidity accumulation
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
            <BarChart data={monthlyCashFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                        {payload.map((entry, index) => (
                          <div key={index} className="flex justify-between gap-4 py-0.5">
                            <span className="text-slate-400 capitalize">{entry.name}:</span>
                            <span className="font-mono font-bold text-slate-100">
                              {formatCurrency(entry.value, currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* 4 & 5. Category Analysis & Invoice Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Expenditure Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">Where company capital is deployed</p>
            </div>
            <span className="text-xs font-mono text-slate-300 font-semibold">100% Audited</span>
          </div>

          <div className="h-52 w-full relative flex items-center justify-center">
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

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10 text-xs max-h-36 overflow-y-auto">
            {expenseCategoryBreakdown.map((c) => (
              <div key={c.name} className="flex items-center justify-between p-1.5 rounded-lg glass-subtle">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="truncate text-slate-300">{c.name}</span>
                </div>
                <span className="font-mono text-slate-400 ml-1">{c.percentage}%</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Invoice Aging & Collection Analytics */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Accounts Receivable Health</h3>
              <p className="text-xs text-slate-400 mt-0.5">Paid vs Pending vs Overdue ratios</p>
            </div>
            <span className="text-xs text-indigo-400 font-semibold font-mono">
              Total: {formatCurrency(invoiceSummary.totalInvoiced, currency)}
            </span>
          </div>

          <div className="h-52 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={invoiceAnalyticsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {invoiceAnalyticsData.map((entry, index) => (
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

          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/10 text-xs">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Paid</span>
              <span className="font-mono font-bold text-slate-100 text-xs">
                {formatCurrency(invoiceSummary.paid, currency)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Pending</span>
              <span className="font-mono font-bold text-slate-100 text-xs">
                {formatCurrency(invoiceSummary.pending, currency)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="text-[10px] text-rose-400 uppercase font-bold block">Overdue</span>
              <span className="font-mono font-bold text-rose-300 text-xs">
                {formatCurrency(invoiceSummary.overdue, currency)}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
