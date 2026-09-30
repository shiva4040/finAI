import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  Check,
  FileText,
  Building,
  Calendar,
} from 'lucide-react';

export const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const { customers, createInvoice, currency } = useFinance();
  const { showToast } = useToast();

  const [selectedCustomerId, setSelectedCustomerId] = useState(
    customers[0]?.id || ''
  );

  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );

  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });

  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('Payment terms: Net 15 days. Please make payment via NEFT/RTGS to our designated corporate treasury account.');

  const [items, setItems] = useState([
    {
      id: 'item-1',
      description: 'Enterprise AI Predictive Analytics Suite (Q4)',
      quantity: 1,
      unitPrice: 75000,
      taxRate: 18,
    },
    {
      id: 'item-2',
      description: 'Dedicated Financial Model Fine-Tuning & SLA Support',
      quantity: 1,
      unitPrice: 25000,
      taxRate: 18,
    },
  ]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculations
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const taxTotal = items.reduce((sum, item) => {
    const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return sum + (lineSubtotal * (Number(item.taxRate) || 0)) / 100;
  }, 0);

  const discountAmount = (subtotal * (Number(discountPercent) || 0)) / 100;
  const total = subtotal + taxTotal - discountAmount;
  const balanceDue = total;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now().toString().slice(-4)}`,
        description: '',
        quantity: 1,
        unitPrice: 10000,
        taxRate: 18,
      },
    ]);
  };

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) {
      showToast({
        title: 'Validation',
        message: 'An invoice must contain at least one line item',
        type: 'warning',
      });
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveInvoice = (status = 'Pending') => {
    if (!selectedCustomer) {
      showToast({
        title: 'Validation Error',
        message: 'Please select a customer for this invoice',
        type: 'error',
      });
      return;
    }

    if (items.some((i) => !i.description.trim())) {
      showToast({
        title: 'Validation Error',
        message: 'All line items must have a description',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newInv = createInvoice({
        id: invoiceNumber,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerEmail: selectedCustomer.email,
        issueDate,
        dueDate,
        status,
        items,
        discount: discountAmount,
        taxTotal,
        subtotal,
        total,
        amountPaid: 0,
        balanceDue: total,
        notes,
      });

      showToast({
        title: status === 'Draft' ? 'Draft Saved' : 'Invoice Dispatched',
        message: `Invoice #${invoiceNumber} for ${selectedCustomer.name} created successfully`,
        type: 'success',
      });

      setIsSubmitting(false);
      navigate(`/invoices/${newInv.id}`);
    }, 400);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-xl glass-subtle text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
              Create Enterprise Invoice
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Draft professional tax invoice with automated tax calculations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            size="md"
            icon={Eye}
            onClick={() => setIsPreviewOpen(true)}
          >
            Preview
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => handleSaveInvoice('Draft')}
            disabled={isSubmitting}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Check}
            onClick={() => handleSaveInvoice('Pending')}
            isLoading={isSubmitting}
          >
            Create & Dispatch
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Invoice Form Column (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Dates Card */}
          <GlassCard>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Client / Customer Account
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="mt-2 text-xs text-slate-400 p-2.5 rounded-lg glass-subtle">
                    <p className="font-semibold text-slate-200">{selectedCustomer.company}</p>
                    <p>{selectedCustomer.address}</p>
                    <p>{selectedCustomer.phone}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Input
                  label="Invoice Number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Issue Date"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                  />
                  <Input
                    label="Due Date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Line Items Card */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-100">Line Items</h3>
                <p className="text-xs text-slate-400 mt-0.5">Itemized products, retainers, and services</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={handleAddItem}
              >
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl glass-subtle border border-white/5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Service or product description..."
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(item.id, 'description', e.target.value)
                        }
                        className="w-full glass-input rounded-lg px-3 py-2 text-xs font-medium placeholder:text-slate-500"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove line item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-full glass-input rounded-lg px-2.5 py-1.5 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">
                        Unit Price (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        className="w-full glass-input rounded-lg px-2.5 py-1.5 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">
                        GST / Tax (%)
                      </label>
                      <select
                        value={item.taxRate}
                        onChange={(e) =>
                          handleItemChange(item.id, 'taxRate', parseFloat(e.target.value) || 0)
                        }
                        className="w-full glass-input rounded-lg px-2 py-1.5 text-xs font-mono"
                      >
                        <option value="0" className="bg-slate-900">0% (Exempt)</option>
                        <option value="5" className="bg-slate-900">5% GST</option>
                        <option value="12" className="bg-slate-900">12% GST</option>
                        <option value="18" className="bg-slate-900">18% GST (Standard)</option>
                        <option value="28" className="bg-slate-900">28% GST</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1 text-xs font-mono">
                    <span className="text-slate-400 mr-2">Line Total:</span>
                    <span className="font-semibold text-slate-100">
                      {formatCurrency(
                        (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * (1 + (Number(item.taxRate) || 0) / 100),
                        currency
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Notes Card */}
          <GlassCard>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Payment Terms & Client Instructions
            </label>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full glass-input rounded-xl p-3 text-xs resize-none"
            />
          </GlassCard>
        </div>

        {/* Calculation Summary Sidebar (1 column) */}
        <div>
          <GlassCard className="sticky top-24 space-y-4">
            <h3 className="text-base font-semibold text-slate-100 border-b border-white/10 pb-3">
              Invoice Breakdown
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Items Subtotal:</span>
                <span className="font-mono font-semibold text-slate-200">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Estimated Tax (GST):</span>
                <span className="font-mono font-semibold text-slate-200">
                  +{formatCurrency(taxTotal, currency)}
                </span>
              </div>

              <div className="pt-2 border-t border-white/5">
                <label className="block text-[10px] text-slate-400 uppercase mb-1">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between mt-1 text-emerald-400">
                    <span>Discount applied:</span>
                    <span className="font-mono">−{formatCurrency(discountAmount, currency)}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-100">Total Invoice Amount:</span>
                <span className="font-bold font-mono text-indigo-400 text-lg">
                  {formatCurrency(total, currency)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                <div className="flex items-center justify-between text-indigo-300 font-semibold">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatCurrency(balanceDue, currency)}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Due by {formatDate(dueDate)} (Net terms)
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-4"
              icon={Check}
              onClick={() => handleSaveInvoice('Pending')}
              isLoading={isSubmitting}
            >
              Issue Invoice
            </Button>
          </GlassCard>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {isPreviewOpen && (
        <Modal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title={`Invoice Preview: #${invoiceNumber}`}
          maxWidth="max-w-2xl"
        >
          <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-6 text-xs bg-slate-900/90">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-100 font-sans">
                  Fin<span className="text-indigo-400">AI</span> Technologies Inc.
                </h2>
                <p className="text-slate-400 mt-0.5">Embassy Tech Village, Bengaluru, India</p>
                <p className="text-slate-400">GSTIN: 29AABCU9603R1ZM</p>
              </div>
              <div className="text-right">
                <span className="text-base font-bold font-mono text-indigo-400">{invoiceNumber}</span>
                <p className="text-slate-400 mt-0.5">Issued: {formatDate(issueDate)}</p>
                <p className="text-rose-400 font-semibold">Due: {formatDate(dueDate)}</p>
              </div>
            </div>

            {/* Billed To */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Billed To:
              </span>
              <h4 className="text-sm font-semibold text-slate-100 mt-0.5">
                {selectedCustomer?.name}
              </h4>
              <p className="text-slate-300">{selectedCustomer?.company}</p>
              <p className="text-slate-400">{selectedCustomer?.address}</p>
              <p className="text-slate-400">{selectedCustomer?.email}</p>
            </div>

            {/* Items */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                  <th className="py-2">Item Description</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Tax</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 text-slate-200 font-medium">{i.description || 'Service'}</td>
                    <td className="py-2 text-center font-mono text-slate-400">{i.quantity}</td>
                    <td className="py-2 text-right font-mono text-slate-300">
                      {formatCurrency(i.unitPrice, currency)}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-400">{i.taxRate}%</td>
                    <td className="py-2 text-right font-mono font-semibold text-slate-100">
                      {formatCurrency(
                        i.quantity * i.unitPrice * (1 + i.taxRate / 100),
                        currency
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total Footer */}
            <div className="border-t border-white/10 pt-3 flex justify-end">
              <div className="w-56 space-y-1.5 text-right">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax Total:</span>
                  <span className="font-mono">{formatCurrency(taxTotal, currency)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span className="font-mono">−{formatCurrency(discountAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-100 text-sm border-t border-white/10 pt-1.5">
                  <span>Total Due:</span>
                  <span className="font-mono text-indigo-400">{formatCurrency(total, currency)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <Button variant="secondary" onClick={() => setIsPreviewOpen(false)}>
                Back to Edit
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsPreviewOpen(false);
                  handleSaveInvoice('Pending');
                }}
              >
                Confirm & Create
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
