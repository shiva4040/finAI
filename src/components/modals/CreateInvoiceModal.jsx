import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { Button } from '../common/Button';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatters';
import {
  FileText,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  User,
  Send,
} from 'lucide-react';

export const CreateInvoiceModal = ({ isOpen, onClose, onInvoiceCreated }) => {
  const { customers, createInvoice, currency } = useFinance();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerEmail: '',
    invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    paymentTerms: 'Net 30',
    notes: 'Payment is due within agreed settlement timeline. Direct bank wire details on file.',
    discountRate: 0,
  });

  const [lineItems, setLineItems] = useState([
    { id: 1, description: 'Enterprise Retainer Q4', quantity: 1, unitPrice: 50000, taxRate: 18 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        customerId: customers[0]?.id || '',
        customerName: customers[0]?.name || '',
        customerEmail: customers[0]?.email || '',
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        paymentTerms: 'Net 30',
        notes: 'Payment is due within agreed settlement timeline. Direct bank wire details on file.',
        discountRate: 0,
      });
      setLineItems([
        { id: 1, description: 'Enterprise Retainer Q4', quantity: 1, unitPrice: 50000, taxRate: 18 },
      ]);
      setErrors({});
    }
  }, [isOpen, customers]);

  const handleCustomerSelect = (custId) => {
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setFormData((prev) => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.name,
        customerEmail: cust.email,
      }));
    }
  };

  const handleAddItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: Date.now(), description: '', quantity: 1, unitPrice: 0, taxRate: 18 },
    ]);
  };

  const handleRemoveItem = (id) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: field === 'description' ? value : parseFloat(value) || 0,
          };
        }
        return item;
      })
    );
  };

  // Financial Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;

    lineItems.forEach((item) => {
      const lineSub = (item.quantity || 0) * (item.unitPrice || 0);
      const lineTax = (lineSub * (item.taxRate || 0)) / 100;
      subtotal += lineSub;
      totalTax += lineTax;
    });

    const discountAmount = (subtotal * (parseFloat(formData.discountRate) || 0)) / 100;
    const totalAmount = subtotal + totalTax - discountAmount;

    return {
      subtotal,
      totalTax,
      discountAmount,
      totalAmount: Math.max(0, totalAmount),
    };
  }, [lineItems, formData.discountRate]);

  const validate = () => {
    const newErrors = {};
    if (!formData.customerName) {
      newErrors.customer = 'Please select or enter a client name';
    }
    if (!formData.issueDate) {
      newErrors.issueDate = 'Issue date is required';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    const hasValidItem = lineItems.some(
      (item) => item.description.trim() && item.quantity > 0 && item.unitPrice > 0
    );
    if (!hasValidItem) {
      newErrors.items = 'At least one line item with valid description, quantity, and price is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (targetStatus = 'Sent') => {
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const invoicePayload = {
        ...formData,
        id: formData.invoiceNumber,
        status: targetStatus,
        subtotal: calculations.subtotal,
        taxAmount: calculations.totalTax,
        discountAmount: calculations.discountAmount,
        totalAmount: calculations.totalAmount,
        balanceDue: calculations.totalAmount,
        items: lineItems.filter((i) => i.description.trim()),
      };

      await createInvoice(invoicePayload);

      showToast({
        title: 'Invoice Created',
        message: `Generated invoice ${formData.invoiceNumber} for ${formData.customerName} (${formatCurrency(calculations.totalAmount, currency)})`,
        type: 'success',
      });

      if (onInvoiceCreated) onInvoiceCreated(invoicePayload);
      onClose();
    } catch (err) {
      console.error('Invoice creation failed:', err);
      showToast({
        title: 'Failed to Create Invoice',
        message: err?.message || 'Server rejected invoice creation.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Commercial Invoice"
      subtitle="Generate compliant corporate invoice with dynamic line items, automated tax, and accounts receivable tracking"
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400">
            Total:{' '}
            <span className="text-base font-bold text-slate-100 font-mono ml-1">
              {formatCurrency(calculations.totalAmount, currency)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit('Draft')}
              disabled={isSubmitting}
            >
              Save Draft
            </Button>
            <Button
              variant="primary"
              icon={Send}
              onClick={() => handleSubmit('Sent')}
              loading={isSubmitting}
            >
              Create & Issue
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Invoice Header Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Client Account <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.customerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="w-full h-[42px] px-3 rounded-xl glass-input text-xs text-slate-200 bg-slate-900 border border-slate-700"
            >
              <option value="">-- Select Client --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.customer && <p className="text-[11px] text-rose-400 mt-1">{errors.customer}</p>}
          </div>

          <Input
            label="Invoice Number"
            required
            value={formData.invoiceNumber}
            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
          />

          <Select
            label="Payment Terms"
            options={[
              { value: 'Due on Receipt', label: 'Due on Receipt' },
              { value: 'Net 15', label: 'Net 15 Days' },
              { value: 'Net 30', label: 'Net 30 Days' },
              { value: 'Net 60', label: 'Net 60 Days' },
            ]}
            value={formData.paymentTerms}
            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
          />
        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Issue Date"
            type="date"
            required
            value={formData.issueDate}
            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            error={errors.issueDate}
          />
          <Input
            label="Due Date"
            type="date"
            required
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            error={errors.dueDate}
          />
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Billable Line Items
            </h4>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={handleAddItem}
              className="py-1 px-2.5 text-xs"
            >
              Add Item
            </Button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {lineItems.map((item, index) => {
              const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800 items-center text-xs"
                >
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Service or Product Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="w-full h-[38px] px-3 rounded-lg glass-input text-xs text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                      className="w-full h-[38px] px-2.5 rounded-lg glass-input text-xs text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                      className="w-full h-[38px] px-2.5 rounded-lg glass-input text-xs text-slate-100 text-right font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2 text-right font-mono font-semibold text-slate-200">
                    {formatCurrency(lineTotal, currency)}
                  </div>
                  <div className="sm:col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={lineItems.length <= 1}
                      className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-30 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {errors.items && <p className="text-xs text-rose-400">{errors.items}</p>}
        </div>

        {/* Calculation Summary Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Discount (%):</span>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.discountRate}
              onChange={(e) => setFormData({ ...formData, discountRate: e.target.value })}
              className="w-16 h-[34px] px-2 rounded-lg glass-input text-center font-mono text-slate-100"
            />
          </div>

          <div className="space-y-1 text-right sm:w-64">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono text-slate-200">{formatCurrency(calculations.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tax (GST/VAT):</span>
              <span className="font-mono text-slate-200">+{formatCurrency(calculations.totalTax, currency)}</span>
            </div>
            {calculations.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount:</span>
                <span className="font-mono">-{formatCurrency(calculations.discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-100 font-bold text-sm pt-1 border-t border-white/10">
              <span>Total Balance Due:</span>
              <span className="font-mono text-indigo-400">{formatCurrency(calculations.totalAmount, currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
