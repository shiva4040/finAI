import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { RecordPaymentModal } from '../components/modals/RecordPaymentModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ArrowLeft,
  Download,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Building,
  Calendar,
  Printer,
  FileCheck,
} from 'lucide-react';

export const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, markInvoiceStatus, currency } = useFinance();
  const { showToast } = useToast();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const invoice = invoices.find((inv) => inv.id === id);

  if (!invoice) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Invoice Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested invoice identifier ({id}) does not exist or was deleted.
        </p>
        <Button variant="secondary" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const handleMarkAsPaid = () => {
    markInvoiceStatus(invoice.id, 'Paid');
    showToast({
      title: 'Invoice Updated',
      message: `Invoice #${invoice.id} marked as fully Paid.`,
      type: 'success',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-xl glass-subtle text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
                {invoice.id}
              </h1>
              <Badge variant={invoice.status.toLowerCase()} size="md">
                {invoice.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Client: <span className="text-slate-200 font-semibold">{invoice.customerName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            size="md"
            icon={Printer}
            onClick={handlePrint}
          >
            Print / PDF
          </Button>

          {invoice.status !== 'Paid' && (
            <>
              <Button
                variant="ghost"
                size="md"
                icon={CheckCircle2}
                onClick={handleMarkAsPaid}
              >
                Mark Paid
              </Button>
              <Button
                variant="success"
                size="md"
                icon={CreditCard}
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Record Payment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Invoice Card (Print Ready) */}
      <GlassCard className="p-6 sm:p-10 space-y-8 bg-slate-900/80 border border-white/10 shadow-2xl">
        {/* Header Branding & Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-extrabold tracking-tight text-slate-100 font-sans">
                Fin<span className="text-indigo-400">AI</span> Technologies Inc.
              </span>
            </div>
            <p className="text-xs text-slate-400">Embassy Tech Village, Outer Ring Road</p>
            <p className="text-xs text-slate-400">Bengaluru, Karnataka 560103, India</p>
            <p className="text-xs text-slate-400 font-mono mt-1">GSTIN: 29AABCU9603R1ZM</p>
          </div>

          <div className="sm:text-right space-y-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Tax Invoice
            </span>
            <h3 className="text-xl font-bold font-mono text-indigo-400">{invoice.id}</h3>
            <p className="text-slate-300">
              <span className="text-slate-400">Issued:</span> {formatDate(invoice.issueDate)}
            </p>
            <p className={invoice.status === 'Overdue' ? 'text-rose-400 font-bold' : 'text-slate-300'}>
              <span className="text-slate-400">Due Date:</span> {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        {/* Client details & Account status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl glass-subtle text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Billed To (Client Entity):
            </span>
            <h4 className="text-sm font-semibold text-slate-100">{invoice.customerName}</h4>
            <p className="text-slate-300 mt-0.5">{invoice.customerEmail}</p>
            <p className="text-slate-400 mt-1">Contract Milestone Deliverable</p>
          </div>

          <div className="sm:text-right flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Outstanding Amount:
            </span>
            <h3 className="text-2xl font-bold font-mono text-slate-100">
              {formatCurrency(invoice.balanceDue ?? invoice.total, currency)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {invoice.status === 'Paid' ? 'Paid in Full' : 'Awaiting Settlement'}
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Description / Scope</th>
                <th className="py-3 px-2 text-center">Qty</th>
                <th className="py-3 px-2 text-right">Unit Rate</th>
                <th className="py-3 px-2 text-right">Tax (%)</th>
                <th className="py-3 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoice.items?.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-3 px-2">
                    <p className="font-semibold text-slate-200">{item.description}</p>
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-slate-300">{item.quantity}</td>
                  <td className="py-3 px-2 text-right font-mono text-slate-300">
                    {formatCurrency(item.unitPrice, currency)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-400">{item.taxRate}%</td>
                  <td className="py-3 px-2 text-right font-mono font-semibold text-slate-100">
                    {formatCurrency(
                      (item.quantity || 1) * item.unitPrice * (1 + (item.taxRate || 0) / 100),
                      currency
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Calculation Summary */}
        <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between gap-6 text-xs">
          <div className="sm:max-w-xs space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Terms & Remittance Notes:
            </span>
            <p className="text-slate-400 leading-relaxed">
              {invoice.notes ||
                'Please remit payment within the agreed net terms. Bank UTR/reference number should be forwarded upon fund transfer.'}
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-2 text-right">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Taxes (GST 18%):</span>
              <span className="font-mono">+{formatCurrency(invoice.taxTotal, currency)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Contract Discount:</span>
                <span className="font-mono">−{formatCurrency(invoice.discount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-100 font-bold text-sm border-t border-white/10 pt-2">
              <span>Total Invoiced:</span>
              <span className="font-mono text-indigo-400">
                {formatCurrency(invoice.total, currency)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-400 text-xs">
              <span>Amount Paid:</span>
              <span className="font-mono">
                {formatCurrency(invoice.amountPaid || 0, currency)}
              </span>
            </div>
            <div className="flex justify-between text-slate-200 font-bold text-sm border-t border-white/5 pt-1">
              <span>Balance Due:</span>
              <span className="font-mono text-amber-400">
                {formatCurrency(invoice.balanceDue ?? invoice.total, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History Section */}
        <div className="border-t border-white/10 pt-6">
          <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">
            Payment & Settlement History
          </h4>

          {invoice.payments && invoice.payments.length > 0 ? (
            <div className="divide-y divide-white/5 rounded-xl glass-subtle overflow-hidden">
              {invoice.payments.map((pmt) => (
                <div key={pmt.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-medium text-slate-200">
                        Payment via {pmt.method}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Ref: {pmt.reference}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-emerald-400">
                      +{formatCurrency(pmt.amount, currency)}
                    </span>
                    <p className="text-[10px] text-slate-400">{formatDate(pmt.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl glass-subtle text-center text-xs text-slate-400">
              No payments have been recorded for this invoice yet.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={invoice}
      />
    </div>
  );
};
