import React, { useState, useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { CreateInvoiceModal } from '../components/modals/CreateInvoiceModal';
import { AIInsightCard } from '../components/common/AIInsightCard';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  DollarSign,
} from 'lucide-react';

export const InvoicesPage = () => {
  const navigate = useNavigate();
  const { invoices, customers, deleteInvoice, invoiceSummary, currency } = useFinance();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        searchTerm === '' ||
        inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        inv.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesCustomer =
        customerFilter === 'ALL' || inv.customerId === customerFilter;

      return matchesSearch && matchesStatus && matchesCustomer;
    });
  }, [invoices, searchTerm, statusFilter, customerFilter]);

  const handleDeleteConfirm = () => {
    if (deletingId) {
      deleteInvoice(deletingId);
      showToast({
        title: 'Invoice Deleted',
        message: 'The invoice record has been removed.',
        type: 'info',
      });
      setDeletingId(null);
    }
  };

  const handleDownloadInvoice = (inv) => {
    showToast({
      title: 'Invoice Download',
      message: `Preparing signed PDF voucher for #${inv.id}...`,
      type: 'info',
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
            Invoicing & Receivables
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Generate, dispatch, and track client enterprise billing cycles and aging receivables
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create New Invoice
        </Button>
      </div>

      {/* AI Insight */}
      <AIInsightCard
        insight={`${
          invoiceSummary.overdueCount > 0
            ? `You have ${invoiceSummary.overdueCount} overdue invoice${
                invoiceSummary.overdueCount > 1 ? 's' : ''
              } totaling ${formatCurrency(invoiceSummary.overdue, currency)}. Acme Technologies represents the primary collection lag.`
            : 'All issued customer invoices are currently within healthy payment terms.'
        }`}
        query="Which invoices are overdue and what are their settlement terms?"
        actionText="Ask FinAI"
      />

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total Invoiced"
          value={formatCurrency(invoiceSummary.totalInvoiced, currency)}
          subtitle="gross billing value"
          icon={FileText}
          accentColor="indigo"
        />
        <StatCard
          title="Settled (Paid)"
          value={formatCurrency(invoiceSummary.paid, currency)}
          change={`${Math.round(
            (invoiceSummary.paid / (invoiceSummary.totalInvoiced || 1)) * 100
          )}% collected`}
          changeType="positive"
          subtitle="successfully cleared"
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <StatCard
          title="Pending Settlement"
          value={formatCurrency(invoiceSummary.pending, currency)}
          changeType="neutral"
          subtitle="awaiting due date maturity"
          icon={Clock}
          accentColor="amber"
        />
        <StatCard
          title="Overdue Balance"
          value={formatCurrency(invoiceSummary.overdue, currency)}
          change={invoiceSummary.overdueCount > 0 ? `${invoiceSummary.overdueCount} overdue` : '0 overdue'}
          changeType={invoiceSummary.overdueCount > 0 ? 'negative' : 'positive'}
          subtitle="past scheduled maturity"
          icon={AlertTriangle}
          accentColor="rose"
        />
      </div>

      {/* Controls & Filter Bar */}
      <GlassCard className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="sm:col-span-1">
            <Input
              icon={Search}
              placeholder="Search by invoice # or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Partially Paid', label: 'Partially Paid' },
                { value: 'Overdue', label: 'Overdue' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
            />
          </div>

          <div>
            <Select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Corporate Clients' },
                ...customers.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        </div>
      </GlassCard>

      {/* Invoices Table */}
      <GlassCard className="p-0 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description="Create your first client invoice or adjust your search filter criteria."
            actionText="Create Invoice"
            onAction={() => navigate('/invoices/create')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer Entity</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                      {inv.id}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs min-w-0">
                      <p className="font-semibold text-slate-200 group-hover:text-white truncate">
                        {inv.customerName}
                      </p>
                      <span className="text-[10px] text-slate-400 block truncate">{inv.customerEmail}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap font-mono">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap font-mono">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                      {formatCurrency(inv.total, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <Badge variant={inv.status.toLowerCase()} size="sm">
                        {inv.status}
                      </Badge>
                    </td>
                    <td
                      className="py-3.5 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <NavLink
                          to={`/invoices/${inv.id}`}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </NavLink>
                        <button
                          onClick={() => handleDownloadInvoice(inv)}
                          title="Download PDF"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(inv.id)}
                          title="Delete Invoice"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Invoice Record"
        message="Are you sure you want to delete this invoice? This will remove the receivable from your dashboard analytics and customer profile."
        confirmText="Delete Invoice"
      />
    </div>
  );
};
