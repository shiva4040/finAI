import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Layers,
  ExternalLink,
} from 'lucide-react';

export const VendorDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vendors, transactions, currency } = useFinance();

  const vendor = vendors.find((v) => v.id === id);

  if (!vendor) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Vendor Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested vendor record ({id}) does not exist.
        </p>
        <Button variant="secondary" onClick={() => navigate('/vendors')}>
          Back to Vendors
        </Button>
      </div>
    );
  }

  // Related transactions
  const vendorTransactions = transactions.filter(
    (tx) =>
      tx.entityName &&
      (tx.entityName.toLowerCase().includes(vendor.name.toLowerCase()) ||
        vendor.name.toLowerCase().includes(tx.entityName.toLowerCase()))
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header Back & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendors')}
            className="p-2 rounded-xl glass-subtle text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">
                {vendor.name}
              </h1>
              <Badge variant={vendor.status === 'Active' ? 'income' : 'neutral'} size="md">
                {vendor.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{vendor.company}</p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="md"
          icon={ExternalLink}
          onClick={() => navigate('/transactions', { state: { openAddModal: true } })}
        >
          Record Direct Expense
        </Button>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          title="Total Lifetime Spending"
          value={formatCurrency(vendor.totalSpending, currency)}
          subtitle="cumulative billing"
          icon={CreditCard}
          accentColor="rose"
        />
        <StatCard
          title="Category Specialization"
          value={vendor.category}
          subtitle="operating domain"
          icon={Layers}
          accentColor="indigo"
        />
        <StatCard
          title="Commercial Terms"
          value={vendor.paymentTerms || 'Net 30'}
          subtitle="settlement agreement"
          icon={Calendar}
          accentColor="amber"
        />
      </div>

      {/* Vendor Profile Information Card */}
      <GlassCard className="p-5 sm:p-6">
        <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-4">
          Vendor & Billing Contact Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start gap-3 min-w-0">
            <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Invoicing Contact
              </span>
              <p className="font-semibold text-slate-200 mt-0.5 truncate">{vendor.email}</p>
              <p className="text-slate-400 truncate">{vendor.contactPerson}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 min-w-0">
            <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Account Telephone
              </span>
              <p className="font-semibold text-slate-200 mt-0.5 font-mono truncate">
                {vendor.phone || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 min-w-0">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Last Transaction Date
              </span>
              <p className="font-semibold text-slate-200 mt-0.5 font-mono truncate">
                {formatDate(vendor.lastTransactionDate)}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Recent Expense History with this vendor */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/10">
          <h3 className="text-base font-semibold text-slate-100">Disbursement History</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical debits and payments recorded for {vendor.name}
          </p>
        </div>

        {vendorTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No specific ledger records tagged under this vendor yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 uppercase text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {vendorTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.03]">
                    <td className="py-3 px-4 text-slate-400 font-mono">{formatDate(tx.date)}</td>
                    <td className="py-3 px-4 text-slate-200 font-medium">{tx.description}</td>
                    <td className="py-3 px-4 text-slate-400">{tx.paymentMethod}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{tx.reference || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                      −{formatCurrency(tx.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
