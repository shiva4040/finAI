import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Receipt,
  Plus,
  CreditCard,
  CheckCircle,
} from 'lucide-react';

export const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, invoices, transactions, currency } = useFinance();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'invoices' | 'transactions' | 'payments'

  const customer = customers.find((c) => c.id === id);

  if (!customer) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Customer Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested customer record ({id}) could not be located.
        </p>
        <Button variant="secondary" onClick={() => navigate('/customers')}>
          Return to CRM
        </Button>
      </div>
    );
  }

  // Customer Invoices & Transactions
  const customerInvoices = invoices.filter(
    (inv) => inv.customerId === customer.id || inv.customerName.toLowerCase() === customer.name.toLowerCase()
  );

  const customerTransactions = transactions.filter(
    (tx) => tx.entityName && tx.entityName.toLowerCase() === customer.name.toLowerCase()
  );

  // All recorded payments for this customer's invoices
  const customerPayments = customerInvoices.flatMap((inv) =>
    (inv.payments || []).map((pmt) => ({ ...pmt, invoiceId: inv.id }))
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header Back & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 rounded-xl glass-subtle text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">
                {customer.name}
              </h1>
              <Badge variant={customer.status === 'Active' ? 'income' : 'neutral'} size="md">
                {customer.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{customer.company}</p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => navigate('/invoices/create')}
        >
          Create New Invoice
        </Button>
      </div>

      {/* Top 3 Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          title="Total Lifetime Invoiced"
          value={formatCurrency(customer.totalInvoiced, currency)}
          subtitle="gross billing"
          icon={FileText}
          accentColor="indigo"
        />
        <StatCard
          title="Total Cleared (Paid)"
          value={formatCurrency(customer.totalPaid, currency)}
          change={`${Math.round(
            (customer.totalPaid / (customer.totalInvoiced || 1)) * 100
          )}% collected`}
          changeType="positive"
          subtitle="successfully collected"
          icon={CheckCircle}
          accentColor="emerald"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(customer.outstanding, currency)}
          change={customer.outstanding > 0 ? 'Active receivable' : 'Zero debt'}
          changeType={customer.outstanding > 0 ? 'negative' : 'positive'}
          subtitle="unpaid invoice dues"
          icon={CreditCard}
          accentColor="amber"
        />
      </div>

      {/* Profile Overview Card */}
      <GlassCard className="p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start gap-3 min-w-0">
            <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Billing Email
              </span>
              <p className="font-semibold text-slate-200 mt-0.5 truncate">{customer.email}</p>
              <p className="text-slate-400 truncate">{customer.contactPerson}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 min-w-0">
            <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Phone Contact
              </span>
              <p className="font-semibold text-slate-200 mt-0.5 font-mono truncate">
                {customer.phone || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 min-w-0">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Corporate Address
              </span>
              <p className="text-slate-200 mt-0.5 leading-relaxed">
                {customer.address || 'Embassy Tech Village, Bengaluru'}
              </p>
            </div>
          </div>
        </div>

        {customer.tags && customer.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10 flex-wrap">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Tags:</span>
            {customer.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md glass-subtle text-slate-300 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </GlassCard>

      {/* CRM Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-1">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'invoices', label: `Invoices (${customerInvoices.length})` },
          { id: 'transactions', label: `Transactions (${customerTransactions.length})` },
          { id: 'payments', label: `Payment History (${customerPayments.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard>
            <h3 className="text-sm font-semibold text-slate-100 mb-3">Client Health Score</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payment Punctuality</span>
                <span className="font-semibold text-emerald-400">94% on-time</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Contract Engagement</span>
                <span className="font-semibold text-indigo-300">Annual Enterprise Tier</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Customer Lifetime Value</span>
                <span className="font-mono font-bold text-slate-100">
                  {formatCurrency(customer.totalInvoiced, currency)}
                </span>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-sm font-semibold text-slate-100 mb-3">AI Account Summary</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {customer.name} is a high-value strategic partner. Average invoice turnaround is 12 days.
              {customer.outstanding > 0
                ? ` There is an outstanding balance of ${formatCurrency(customer.outstanding, currency)} pending settlement.`
                : ' All historical billing is fully reconciled.'}
            </p>
          </GlassCard>
        </div>
      )}

      {activeTab === 'invoices' && (
        <GlassCard className="p-0 overflow-hidden">
          {customerInvoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No invoices generated for this client yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 uppercase text-[10px]">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Issued</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customerInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-white/[0.03] cursor-pointer"
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{inv.id}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{formatDate(inv.issueDate)}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{formatDate(inv.dueDate)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                        {formatCurrency(inv.total, currency)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={inv.status.toLowerCase()} size="sm">
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === 'transactions' && (
        <GlassCard className="p-0 overflow-hidden">
          {customerTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No direct transactions logged under this client name.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 uppercase text-[10px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customerTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.03]">
                      <td className="py-3 px-4 text-slate-400 font-mono">{formatDate(tx.date)}</td>
                      <td className="py-3 px-4 text-slate-200 font-medium">{tx.description}</td>
                      <td className="py-3 px-4 text-slate-400">{tx.paymentMethod}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        +{formatCurrency(tx.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === 'payments' && (
        <GlassCard className="p-0 overflow-hidden">
          {customerPayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No recorded payments yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 uppercase text-[10px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Applied to Invoice</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customerPayments.map((pmt, i) => (
                    <tr key={pmt.id || i} className="hover:bg-white/[0.03]">
                      <td className="py-3 px-4 text-slate-400 font-mono">{formatDate(pmt.date)}</td>
                      <td className="py-3 px-4 font-mono text-indigo-400 font-bold">{pmt.invoiceId}</td>
                      <td className="py-3 px-4 text-slate-300">{pmt.method}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{pmt.reference}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        +{formatCurrency(pmt.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
};
