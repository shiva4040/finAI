import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { Button } from '../common/Button';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatters';

export const RecordPaymentModal = ({ isOpen, onClose, invoice }) => {
  const { recordPayment, currency } = useFinance();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('Bank Transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invoice) {
      setAmount(invoice.balanceDue > 0 ? invoice.balanceDue.toString() : invoice.total.toString());
      setDate(new Date().toISOString().split('T')[0]);
      setMethod('Bank Transfer');
      setReference(`UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
      setNotes(`Payment received for invoice ${invoice.id}`);
      setError('');
    }
  }, [isOpen, invoice]);

  if (!invoice) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      recordPayment(invoice.id, {
        amount: numAmount,
        date,
        method,
        reference,
        notes,
      });

      showToast({
        title: 'Payment Recorded',
        message: `Successfully recorded ${formatCurrency(numAmount, currency)} for ${invoice.id}`,
        type: 'success',
      });

      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  const methods = [
    { value: 'Bank Transfer', label: 'Direct Bank Transfer (NEFT/RTGS)' },
    { value: 'UPI', label: 'UPI Instant' },
    { value: 'Corporate Card', label: 'Corporate Card' },
    { value: 'Stripe Corporate', label: 'Stripe Online' },
    { value: 'Wire Transfer', label: 'SWIFT / Wire Transfer' },
    { value: 'Cheque', label: 'Bank Cheque / Draft' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Invoice Payment"
      subtitle={`Receive settlement for invoice #${invoice.id} (${invoice.customerName})`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Invoice Balance Summary Banner */}
        <div className="p-3.5 rounded-xl glass-subtle flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Total Invoice:</span>
            <p className="font-semibold text-slate-200 mt-0.5 font-mono">
              {formatCurrency(invoice.total, currency)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-slate-400">Balance Outstanding:</span>
            <p className="font-semibold text-amber-400 mt-0.5 font-mono">
              {formatCurrency(invoice.balanceDue ?? invoice.total, currency)}
            </p>
          </div>
        </div>

        <Input
          label="Payment Amount"
          type="number"
          step="any"
          prefix={currency === 'INR' ? '₹' : '$'}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
          error={error}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Payment Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Select
            label="Payment Method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            options={methods}
          />
        </div>

        <Input
          label="Transaction Reference / UTR #"
          placeholder="e.g. UTR-9821849182"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />

        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            Payment Remarks
          </label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="success" isLoading={isSubmitting}>
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
