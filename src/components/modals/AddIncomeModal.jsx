import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { Button } from '../common/Button';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { TrendingUp, DollarSign } from 'lucide-react';

export const AddIncomeModal = ({ isOpen, onClose, editItem = null }) => {
  const { addTransaction, updateTransaction, customers, currency } = useFinance();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Client Retainer',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    reference: '',
    entityName: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editItem) {
      setFormData({
        description: editItem.description || '',
        amount: editItem.amount?.toString() || '',
        category: editItem.category || 'Client Retainer',
        date: editItem.date || new Date().toISOString().split('T')[0],
        paymentMethod: editItem.paymentMethod || 'Bank Transfer',
        reference: editItem.reference || '',
        entityName: editItem.entityName || '',
        notes: editItem.notes || '',
      });
    } else {
      setFormData({
        description: '',
        amount: '',
        category: 'Client Retainer',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        reference: '',
        entityName: '',
        notes: '',
      });
    }
    setErrors({});
  }, [isOpen, editItem]);

  const validate = () => {
    const newErrors = {};
    if (!formData.description.trim()) {
      newErrors.description = 'Income source description is required';
    }
    const parsedAmount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }
    if (!formData.date) {
      newErrors.date = 'Transaction date is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editItem) {
        await updateTransaction(editItem.id, {
          ...formData,
          type: 'Income',
          amount: parseFloat(formData.amount),
        });
        showToast({
          title: 'Income Updated',
          message: `Updated income entry to ${currency === 'INR' ? '₹' : '$'}${formData.amount}`,
          type: 'success',
        });
      } else {
        await addTransaction({
          ...formData,
          type: 'Income',
          amount: parseFloat(formData.amount),
        });
        showToast({
          title: 'Income Recorded',
          message: `Recorded inflow of ${currency === 'INR' ? '₹' : '$'}${formData.amount} (${formData.description})`,
          type: 'success',
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save income:', err);
      showToast({
        title: 'Error Saving Income',
        message: err?.message || 'Server rejected income entry.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const incomeCategories = [
    { value: 'Client Retainer', label: 'Client Retainer' },
    { value: 'Enterprise Licensing', label: 'Enterprise Licensing / SaaS' },
    { value: 'Advisory & Consulting', label: 'Advisory & Consulting' },
    { value: 'Investment & Yield', label: 'Investment & Treasury Yield' },
    { value: 'Grant & Capital', label: 'Grant & Capital Inflow' },
    { value: 'Other Inflow', label: 'Other Revenue' },
  ];

  const paymentMethods = [
    { value: 'Bank Transfer', label: 'Bank Transfer / NEFT / RTGS' },
    { value: 'Card', label: 'Corporate Credit Card / Stripe' },
    { value: 'UPI', label: 'UPI / Direct Instant Settlement' },
    { value: 'Cash', label: 'Cash Receipt' },
    { value: 'Other', label: 'Wire / Escrow Account' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Edit Income Record' : 'Record New Income Entry'}
      subtitle="Record verified revenue inflows, client retainers, SaaS licenses, and treasury returns"
      size="xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-income-form"
            variant="success"
            icon={TrendingUp}
            loading={isSubmitting}
          >
            {editItem ? 'Save Income Changes' : 'Record Income'}
          </Button>
        </div>
      }
    >
      <form id="add-income-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Source Description */}
        <Input
          label="Income Source / Description"
          required
          placeholder="e.g. Q4 Enterprise Retainer, AWS Consulting Settlement"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          error={errors.description}
        />

        {/* Amount & Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`Inflow Amount (${currency})`}
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            icon={DollarSign}
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            error={errors.amount}
          />

          <Input
            label="Date of Receipt"
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            error={errors.date}
          />
        </div>

        {/* Category & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Income Category"
            options={incomeCategories}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />

          <Select
            label="Deposit Channel"
            options={paymentMethods}
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
          />
        </div>

        {/* Client Entity & Reference Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Payer / Client Account
            </label>
            <input
              type="text"
              list="client-suggestions"
              placeholder="e.g. Acme Corp, Global Tech Partners"
              value={formData.entityName}
              onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
              className="w-full h-[42px] px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-500 transition-colors"
            />
            <datalist id="client-suggestions">
              {customers?.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>

          <Input
            label="Reference / Cheque / UTR #"
            placeholder="e.g. UTR-982103810, INV-2026-004"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
          />
        </div>

        {/* Ledger Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Internal Accounting Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Additional contract milestone terms, TDS withholding deductions, or banking reconciliations..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-500 transition-colors resize-none"
          />
        </div>
      </form>
    </Modal>
  );
};
