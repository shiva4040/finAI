import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { Button } from '../common/Button';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const AddTransactionModal = ({
  isOpen,
  onClose,
  initialType = 'Expense',
  editItem = null,
}) => {
  const { addTransaction, updateTransaction, currency } = useFinance();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    type: initialType,
    description: '',
    amount: '',
    category: '',
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
        type: editItem.type || initialType,
        description: editItem.description || '',
        amount: editItem.amount?.toString() || '',
        category: editItem.category || '',
        date: editItem.date || new Date().toISOString().split('T')[0],
        paymentMethod: editItem.paymentMethod || 'Bank Transfer',
        reference: editItem.reference || '',
        entityName: editItem.entityName || '',
        notes: editItem.notes || '',
      });
    } else {
      setFormData({
        type: initialType,
        description: '',
        amount: '',
        category: initialType === 'Income' ? 'Client Retainer' : 'Cloud & Tech',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        reference: '',
        entityName: '',
        notes: '',
      });
    }
    setErrors({});
  }, [isOpen, editItem, initialType]);

  const incomeCategories = [
    { value: 'Client Retainer', label: 'Client Retainer' },
    { value: 'Enterprise Licensing', label: 'Enterprise Licensing' },
    { value: 'Consulting', label: 'Consulting Services' },
    { value: 'Investments', label: 'Investments & Dividends' },
    { value: 'Affiliate & Referrals', label: 'Affiliate & Referrals' },
    { value: 'Other Income', label: 'Other Income' },
  ];

  const expenseCategories = [
    { value: 'Cloud & Tech', label: 'Cloud & Infrastructure' },
    { value: 'Salaries & Contractors', label: 'Salaries & Contractors' },
    { value: 'Office & Rent', label: 'Office & Real Estate' },
    { value: 'Software & SaaS', label: 'Software & SaaS Tools' },
    { value: 'Marketing', label: 'Marketing & Ads' },
    { value: 'Legal & Compliance', label: 'Legal & Compliance' },
    { value: 'Food & Dining', label: 'Food & Entertainment' },
    { value: 'Transport & Travel', label: 'Travel & Transport' },
    { value: 'Other Expense', label: 'Other Operating Expense' },
  ];

  const paymentMethods = [
    { value: 'Bank Transfer', label: 'Bank Transfer (NEFT/RTGS)' },
    { value: 'Corporate Card', label: 'Corporate Credit Card' },
    { value: 'UPI', label: 'UPI Instant' },
    { value: 'Stripe', label: 'Stripe Corporate' },
    { value: 'Wire Transfer', label: 'International Wire Transfer' },
    { value: 'Cash / Petty Cash', label: 'Petty Cash' },
  ];

  const validate = () => {
    const newErrors = {};
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.date) newErrors.date = 'Date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      if (editItem) {
        updateTransaction(editItem.id, {
          ...formData,
          amount: parseFloat(formData.amount),
        });
        showToast({
          title: 'Transaction Updated',
          message: `Successfully modified ${formData.description}`,
          type: 'success',
        });
      } else {
        addTransaction({
          ...formData,
          amount: parseFloat(formData.amount),
        });
        showToast({
          title: 'Transaction Recorded',
          message: `Added ${formData.type.toLowerCase()} of ${currency === 'INR' ? '₹' : '$'}${formData.amount}`,
          type: 'success',
        });
      }
      setIsSubmitting(false);
      onClose();
    }, 300);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Edit Transaction' : 'Record New Transaction'}
      subtitle="Enter financial transaction details to maintain accurate ledger balancing"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Toggle: Income vs Expense */}
        <div className="grid grid-cols-2 gap-3 p-1 rounded-xl glass-subtle">
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                type: 'Income',
                category: 'Client Retainer',
              }))
            }
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              formData.type === 'Income'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Income (Credit)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                type: 'Expense',
                category: 'Cloud & Tech',
              }))
            }
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              formData.type === 'Expense'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Expense (Debit)</span>
          </button>
        </div>

        {/* Description & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Description / Purpose"
              placeholder="e.g. AWS Cloud Clusters or Client Retainer"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              error={errors.description}
              required
            />
          </div>
          <div>
            <Input
              label="Amount"
              type="number"
              step="any"
              placeholder="0.00"
              prefix={currency === 'INR' ? '₹' : '$'}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              error={errors.amount}
              required
            />
          </div>
        </div>

        {/* Category & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={formData.type === 'Income' ? incomeCategories : expenseCategories}
            error={errors.category}
          />
          <Select
            label="Payment Method"
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            options={paymentMethods}
          />
        </div>

        {/* Date & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Transaction Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            error={errors.date}
            required
          />
          <Input
            label="Reference # / Transaction ID"
            placeholder="e.g. UTR-987112049, CC-4921"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
          />
        </div>

        {/* Counterparty / Entity name */}
        <Input
          label={formData.type === 'Income' ? 'Client / Payer Entity' : 'Vendor / Payee Entity'}
          placeholder="e.g. Acme Technologies, Amazon Web Services"
          value={formData.entityName}
          onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
        />

        {/* Internal Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            Internal Ledger Notes (Optional)
          </label>
          <textarea
            rows="2"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add reconciliation notes, tax codes, or milestone descriptions..."
            className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={formData.type === 'Income' ? 'success' : 'primary'}
            isLoading={isSubmitting}
          >
            {editItem ? 'Save Changes' : `Confirm ${formData.type}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
