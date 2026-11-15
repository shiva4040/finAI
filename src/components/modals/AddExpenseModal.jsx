import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { Button } from '../common/Button';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { TrendingDown, DollarSign } from 'lucide-react';

export const AddExpenseModal = ({ isOpen, onClose, editItem = null }) => {
  const { addTransaction, updateTransaction, vendors, currency } = useFinance();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Cloud Infrastructure',
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
        category: editItem.category || 'Cloud Infrastructure',
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
        category: 'Cloud Infrastructure',
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
      newErrors.description = 'Expense description is required';
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
          type: 'Expense',
          amount: parseFloat(formData.amount),
        });
        showToast({
          title: 'Expense Updated',
          message: `Updated expense to ${currency === 'INR' ? '₹' : '$'}${formData.amount}`,
          type: 'success',
        });
      } else {
        await addTransaction({
          ...formData,
          type: 'Expense',
          amount: parseFloat(formData.amount),
        });
        showToast({
          title: 'Expense Recorded',
          message: `Recorded outflow of ${currency === 'INR' ? '₹' : '$'}${formData.amount} (${formData.description})`,
          type: 'info',
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save expense:', err);
      showToast({
        title: 'Error Saving Expense',
        message: err?.message || 'Server rejected expense entry.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const expenseCategories = [
    { value: 'Cloud Infrastructure', label: 'Cloud Infrastructure / Hosting' },
    { value: 'Salaries & Payroll', label: 'Salaries, Benefits & Payroll' },
    { value: 'Office Rent & Facilities', label: 'Office Rent & Commercial Lease' },
    { value: 'Marketing & Advertising', label: 'Marketing, Growth & Ads' },
    { value: 'Legal & Professional', label: 'Legal, Audit & Accounting' },
    { value: 'Hardware & Equipment', label: 'Hardware, Laptops & Servers' },
    { value: 'Travel & Operations', label: 'Travel, Meals & Operations' },
    { value: 'Software Subscriptions', label: 'SaaS Tooling & Licenses' },
    { value: 'Other Expense', label: 'Other Operational Burn' },
  ];

  const paymentMethods = [
    { value: 'Bank Transfer', label: 'Corporate Bank Transfer / Wire' },
    { value: 'Card', label: 'Company Credit Card / Corporate Card' },
    { value: 'UPI', label: 'UPI / Direct Vendor Settlement' },
    { value: 'Cash', label: 'Petty Cash Voucher' },
    { value: 'Other', label: 'Direct Debit / ACH' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Edit Expense Record' : 'Record New Expense Entry'}
      subtitle="Track verified company expenditures, vendor payouts, infrastructure burn, and payroll"
      size="xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-expense-form"
            variant="danger"
            icon={TrendingDown}
            loading={isSubmitting}
          >
            {editItem ? 'Save Expense Changes' : 'Record Expense'}
          </Button>
        </div>
      }
    >
      <form id="add-expense-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Description */}
        <Input
          label="Expense Item / Purpose"
          required
          placeholder="e.g. AWS Production Cluster Hosting, WeWork Monthly Lease"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          error={errors.description}
        />

        {/* Amount & Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`Outflow Amount (${currency})`}
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
            label="Date of Payment"
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
            label="Expense Classification"
            options={expenseCategories}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />

          <Select
            label="Disbursement Channel"
            options={paymentMethods}
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
          />
        </div>

        {/* Vendor Entity & Reference Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Payee / Vendor Account
            </label>
            <input
              type="text"
              list="vendor-suggestions"
              placeholder="e.g. Amazon Web Services, Google Cloud, Microsoft"
              value={formData.entityName}
              onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
              className="w-full h-[42px] px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-500 transition-colors"
            />
            <datalist id="vendor-suggestions">
              {vendors?.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </div>

          <Input
            label="Vendor Invoice / Receipt #"
            placeholder="e.g. INV-998201, BILL-AWS-NOV26"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
          />
        </div>

        {/* Internal Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Internal Accounting & Tax Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="GST input credit claim eligibility, department budget line, or manager approval stamp..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-500 transition-colors resize-none"
          />
        </div>
      </form>
    </Modal>
  );
};
