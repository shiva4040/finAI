import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';

export const AddCustomerModal = ({ isOpen, onClose, editCustomer = null }) => {
  const { addCustomer, updateCustomer } = useFinance();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    tags: 'Enterprise, SaaS',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editCustomer) {
      setFormData({
        name: editCustomer.name || '',
        company: editCustomer.company || '',
        contactPerson: editCustomer.contactPerson || '',
        email: editCustomer.email || '',
        phone: editCustomer.phone || '',
        address: editCustomer.address || '',
        tags: editCustomer.tags ? editCustomer.tags.join(', ') : '',
      });
    } else {
      setFormData({
        name: '',
        company: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        tags: 'Enterprise, SaaS',
      });
    }
    setErrors({});
  }, [isOpen, editCustomer]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Client name is required';
    if (!formData.email.trim()) newErrors.email = 'Billing email is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const formattedTags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (editCustomer) {
        updateCustomer(editCustomer.id, {
          ...formData,
          tags: formattedTags,
        });
        showToast({
          title: 'Customer Updated',
          message: `Saved changes for ${formData.name}`,
          type: 'success',
        });
      } else {
        addCustomer({
          ...formData,
          tags: formattedTags,
        });
        showToast({
          title: 'Customer Added',
          message: `${formData.name} successfully registered in CRM`,
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
      title={editCustomer ? 'Edit Customer' : 'Add New Customer'}
      subtitle="Register client accounts for automated billing and revenue tracking"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-customer-form"
            variant="primary"
            isLoading={isSubmitting}
          >
            {editCustomer ? 'Update Customer' : 'Save Customer'}
          </Button>
        </>
      }
    >
      <form id="add-customer-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Account / Brand Name"
          placeholder="e.g. Acme Technologies"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Legal Company Name"
            placeholder="e.g. Acme Tech Pvt Ltd"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
          <Input
            label="Primary Contact Person"
            placeholder="e.g. Alex Rivera"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Billing Email"
            type="email"
            placeholder="finance@acmetech.io"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91 98450 12345"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <Input
          label="Registered Address"
          placeholder="e.g. Embassy Tech Village, Outer Ring Road, Bengaluru"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />

        <Input
          label="Tags (Comma separated)"
          placeholder="Enterprise, Monthly Retainer, SaaS"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
        />
      </form>
    </Modal>
  );
};
