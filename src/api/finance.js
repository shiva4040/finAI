import { apiClient } from './client';

export const financeApi = {
  // Categories
  getCategories: (type) => apiClient.get(`/categories${type ? `?type=${type}` : ''}`),
  createCategory: (data) => apiClient.post('/categories', data),
  deleteCategory: (id) => apiClient.delete(`/categories/${id}`),

  // Transactions
  getTransactions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/transactions${query ? `?${query}` : ''}`);
  },
  createTransaction: (data) => apiClient.post('/transactions', data),
  getTransaction: (id) => apiClient.get(`/transactions/${id}`),
  updateTransaction: (id, data) => apiClient.patch(`/transactions/${id}`, data),
  deleteTransaction: (id) => apiClient.delete(`/transactions/${id}`),
  previewCSV: (formData) => apiClient.post('/transactions/preview-csv', formData),
  importCSV: (formData) => apiClient.post('/transactions/import-csv', formData),

  // Income
  getIncomeSummary: (currency = 'INR') => apiClient.get(`/income/summary?currency=${currency}`),
  getIncomeByCategory: (currency = 'INR') => apiClient.get(`/income/by-category?currency=${currency}`),
  getIncomeTrends: (year, currency = 'INR') => apiClient.get(`/income/trends?${year ? `year=${year}&` : ''}currency=${currency}`),

  // Expenses
  getExpenseSummary: (currency = 'INR') => apiClient.get(`/expenses/summary?currency=${currency}`),
  getExpensesByCategory: (currency = 'INR') => apiClient.get(`/expenses/by-category?currency=${currency}`),
  getExpenseTrends: (year, currency = 'INR') => apiClient.get(`/expenses/trends?${year ? `year=${year}&` : ''}currency=${currency}`),
  getLargestExpenses: (limit = 5, currency = 'INR') => apiClient.get(`/expenses/largest?limit=${limit}&currency=${currency}`),

  // Customers
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/customers${query ? `?${query}` : ''}`);
  },
  getCustomer: (id) => apiClient.get(`/customers/${id}`),
  createCustomer: (data) => apiClient.post('/customers', data),
  updateCustomer: (id, data) => apiClient.patch(`/customers/${id}`, data),
  deleteCustomer: (id) => apiClient.delete(`/customers/${id}`),
  getCustomerSummary: (id) => apiClient.get(`/customers/${id}/summary`),
  getCustomerInvoices: (id) => apiClient.get(`/customers/${id}/invoices`),

  // Vendors
  getVendors: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/vendors${query ? `?${query}` : ''}`);
  },
  getVendor: (id) => apiClient.get(`/vendors/${id}`),
  createVendor: (data) => apiClient.post('/vendors', data),
  updateVendor: (id, data) => apiClient.patch(`/vendors/${id}`, data),
  deleteVendor: (id) => apiClient.delete(`/vendors/${id}`),
  getVendorSummary: (id) => apiClient.get(`/vendors/${id}/summary`),
  getVendorExpenses: (id) => apiClient.get(`/vendors/${id}/expenses`),

  // Invoices
  getInvoices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/invoices${query ? `?${query}` : ''}`);
  },
  getInvoice: (id) => apiClient.get(`/invoices/${id}`),
  createInvoice: (data) => apiClient.post('/invoices', data),
  sendInvoice: (id) => apiClient.post(`/invoices/${id}/send`),
  cancelInvoice: (id) => apiClient.post(`/invoices/${id}/cancel`),
  deleteInvoice: (id) => apiClient.delete(`/invoices/${id}`),
  downloadInvoicePdf: (id, invoiceNumber) => apiClient.download(`/invoices/${id}/pdf`, `${invoiceNumber || 'invoice'}.pdf`),

  // Payments
  getPayments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/payments${query ? `?${query}` : ''}`);
  },
  recordPayment: (data) => apiClient.post('/payments', data),
  reversePayment: (id) => apiClient.post(`/payments/${id}/reverse`),

  // Dashboard
  getDashboardSummary: (period = 'this_month', currency = 'INR') =>
    apiClient.get(`/dashboard/summary?period=${period}&currency=${currency}`),
};
