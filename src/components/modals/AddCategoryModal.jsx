import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { financeApi } from '../../api/finance';
import { Layers, Palette } from 'lucide-react';

export const AddCategoryModal = ({ isOpen, onClose, onCategoryCreated }) => {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    color: '#6366F1',
    description: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = [
    '#6366F1', // Indigo
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#EF4444', // Red
  ];

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newCategory = await financeApi.createCategory({
        name: formData.name.trim(),
        type: formData.type.toLowerCase(),
        color: formData.color,
        description: formData.description.trim() || undefined,
        icon: 'Layers',
      });

      showToast({
        title: 'Category Created',
        message: `Added new category '${formData.name}' to ${formData.type} classifications`,
        type: 'success',
      });

      if (onCategoryCreated) onCategoryCreated(newCategory);
      setFormData({ name: '', type: 'expense', color: '#6366F1', description: '' });
      onClose();
    } catch (err) {
      console.error('Failed to create category:', err);
      showToast({
        title: 'Error Creating Category',
        message: err?.message || 'Server rejected category creation.',
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
      title="Create Ledger Category"
      subtitle="Define custom classifications for organizing inflows and operating expenditures"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-category-form"
            variant="primary"
            icon={Layers}
            loading={isSubmitting}
          >
            Create Category
          </Button>
        </div>
      }
    >
      <form id="add-category-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <Input
          label="Category Name"
          required
          placeholder="e.g. Software Subscriptions, Legal Retainers"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
        />

        {/* Type Selector */}
        <Select
          label="Classification Type"
          options={[
            { value: 'expense', label: 'Expense (Outflow classification)' },
            { value: 'income', label: 'Income (Revenue / Inflow classification)' },
          ]}
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
        />

        {/* Color Palette Picker */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            Badge Accent Color
          </label>
          <div className="flex items-center gap-2.5 flex-wrap">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFormData({ ...formData, color: c })}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-xl transition-transform hover:scale-110 flex items-center justify-center ${
                  formData.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105' : ''
                }`}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Accounting Description (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Brief scope of costs or revenues included under this classification..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-500 transition-colors resize-none"
          />
        </div>
      </form>
    </Modal>
  );
};
