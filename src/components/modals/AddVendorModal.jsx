import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { Button } from '../common/Button';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';

export const AddVendorModal = ({ isOpen, onClose, editVendor = null }) => {
  const { addVendor, updateVendor } = useFinance();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    contactPerson: '',
    email: '',
    phone: '',
    category: 'Cloud & Infrastructure',
    paymentTerms: 'Net 30',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editVendor) {
      setFormData({
        name: editVendor.name || '',
        company: editVendor.company || '',
        contactPerson: editVendor.contactPerson || '',
        email: editVendor.email || '',
        phone: editVendor.phone || '',
        category: editVendor.category || 'Cloud & Infrastructure',
        paymentTerms: editVendor.paymentTerms || 'Net 30',
      });
    } else {
      setFormData({
        name: '',
        company: '',
        contactPerson: '',
        email: '',
        phone: '',
        category: 'Cloud & Infrastructure',
        paymentTerms: 'Net 30',
      });
    }
    setErrors({});
  }, [isOpen, editVendor]);

  const categories = [
    { value: 'Cloud & Infrastructure', label: 'Cloud & Infrastructure' },
    { value: 'AI & GPU Compute', label: 'AI & GPU Compute' },
    { value: 'Office & Facilities', label: 'Office & Facilities' },
    { value: 'Software & SaaS', label: 'Software & SaaS' },
    { value: 'Legal & Compliance', label: 'Legal & Compliance' },
    { value: 'Hardware & Devices', label: 'Hardware & Devices' },
    { value: 'Marketing & PR', label: 'Marketing & PR' },
    { value: 'Other Services', label: 'Other Services' },
  ];

  const paymentTermsOptions = [
    { value: 'Due on Receipt', label: 'Due on Receipt' },
    { value: 'Net 15', label: 'Net 15 Days' },
    { value: 'Net 30', label: 'Net 30 Days' },
    { value: 'Net 60', label: 'Net 60 Days' },
    { value: 'Annual Recurring', label: 'Annual Recurring' },
    { value: 'Prepaid', label: 'Prepaid / Upfront' },
  ];

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Vendor name is required';
    if (!formData.email.trim()) newErrors.email = 'Contact email is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      if (editVendor) {
        updateVendor(editVendor.id, formData);
        showToast({
          title: 'Vendor Updated',
          message: `Saved changes for ${formData.name}`,
          type: 'success',
        });
      } else {
        addVendor(formData);
        showToast({
          title: 'Vendor Added',
          message: `${formData.name} added to vendor registry`,
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
      title={editVendor ? 'Edit Vendor' : 'Add New Vendor'}
      subtitle="Register suppliers, SaaS tools, and service providers"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-vendor-form"
            variant="primary"
            isLoading={isSubmitting}
          >
            {editVendor ? 'Update Vendor' : 'Save Vendor'}
          </Button>
        </>
      }
    >
      <form id="add-vendor-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Vendor / Provider Name"
          placeholder="e.g. Amazon Web Services"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Corporate Entity"
            placeholder="e.g. AWS Cloud Services India"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
          <Input
            label="Account Manager / Rep"
            placeholder="e.g. Enterprise Billing Desk"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Billing Email"
            type="email"
            placeholder="invoicing@aws.amazon.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
          />
          <Input
            label="Contact Phone"
            placeholder="+1 800 200 9876"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={categories}
          />
          <Select
            label="Payment Terms"
            value={formData.paymentTerms}
            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
            options={paymentTermsOptions}
          />
        </div>
      </form>
    </Modal>
  );
};
