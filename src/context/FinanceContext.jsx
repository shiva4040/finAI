import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { notificationsApi } from '../api/notifications';
import { financeApi } from '../api/finance';
import {
  initialTransactions,
  initialInvoices,
  initialCustomers,
  initialVendors,
  initialNotifications,
  monthlyCashFlowData,
  expenseCategoryBreakdown,
  incomeCategoryBreakdown,
} from '../data/mockData';

const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
  // Load state from localStorage or fall back to mock data
  const [transactions, setTransactions] = useState(() => {
    try {
      const stored = localStorage.getItem('finai_transactions');
      return stored ? JSON.parse(stored) : initialTransactions;
    } catch {
      return initialTransactions;
    }
  });

  const [invoices, setInvoices] = useState(() => {
    try {
      const stored = localStorage.getItem('finai_invoices');
      return stored ? JSON.parse(stored) : initialInvoices;
    } catch {
      return initialInvoices;
    }
  });

  const [customers, setCustomers] = useState(() => {
    try {
      const stored = localStorage.getItem('finai_customers');
      return stored ? JSON.parse(stored) : initialCustomers;
    } catch {
      return initialCustomers;
    }
  });

  const [vendors, setVendors] = useState(() => {
    try {
      const stored = localStorage.getItem('finai_vendors');
      return stored ? JSON.parse(stored) : initialVendors;
    } catch {
      return initialVendors;
    }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('finai_notifications');
      return stored ? JSON.parse(stored) : initialNotifications;
    } catch {
      return initialNotifications;
    }
  });

  const [currency, setCurrency] = useState(() => {
    try {
      return localStorage.getItem('finai_currency') || 'INR';
    } catch {
      return 'INR';
    }
  });

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('finai_transactions', JSON.stringify(transactions));
      localStorage.setItem('finai_invoices', JSON.stringify(invoices));
      localStorage.setItem('finai_customers', JSON.stringify(customers));
      localStorage.setItem('finai_vendors', JSON.stringify(vendors));
      localStorage.setItem('finai_notifications', JSON.stringify(notifications));
      localStorage.setItem('finai_currency', currency);
    } catch (e) {
      console.error('Failed to save finance state to localStorage', e);
    }
  }, [transactions, invoices, customers, vendors, notifications, currency]);

  // Derived financial metrics
  const financialSummary = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'Income' && t.status === 'Completed')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'Expense' && t.status === 'Completed')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const netCashFlow = totalIncome - totalExpenses;
    const totalBalance = 2480000 + netCashFlow; // Baseline reserves + cash flow

    // This month metrics (September 2026)
    const thisMonthIncome = transactions
      .filter((t) => t.type === 'Income' && t.date?.startsWith('2026-09'))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const thisMonthExpenses = transactions
      .filter((t) => t.type === 'Expense' && t.date?.startsWith('2026-09'))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const avgMonthlyIncome = Math.round(totalIncome / 3);
    const avgMonthlyExpense = Math.round(totalExpenses / 3);

    const expensesList = transactions.filter((t) => t.type === 'Expense');
    const largestExpense = expensesList.length > 0 
      ? Math.max(...expensesList.map(t => Number(t.amount || 0)))
      : 0;

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
      netCashFlow,
      thisMonthIncome,
      thisMonthExpenses,
      avgMonthlyIncome,
      avgMonthlyExpense,
      largestExpense,
    };
  }, [transactions]);

  // Invoice summary metrics
  const invoiceSummary = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const paid = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + Number(i.total || 0), 0);
    const pending = invoices.filter(i => i.status === 'Pending' || i.status === 'Partially Paid').reduce((sum, i) => sum + Number(i.balanceDue || 0), 0);
    const overdue = invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + Number(i.balanceDue || 0), 0);
    const overdueCount = invoices.filter(i => i.status === 'Overdue').length;

    return {
      totalInvoiced,
      paid,
      pending,
      overdue,
      overdueCount,
      totalCount: invoices.length,
    };
  }, [invoices]);

  // Transaction CRUD Actions
  const addTransaction = (transactionData) => {
    const newTx = {
      id: `tx-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      status: 'Completed',
      ...transactionData,
      amount: Number(transactionData.amount) || 0,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // If related to a customer or vendor, update their totals
    if (newTx.type === 'Expense' && newTx.entityName) {
      setVendors((prev) =>
        prev.map((v) =>
          v.name.toLowerCase() === newTx.entityName.toLowerCase()
            ? { ...v, totalSpending: v.totalSpending + newTx.amount, lastTransactionDate: newTx.date }
            : v
        )
      );
    }

    return newTx;
  };

  const updateTransaction = (id, updatedData) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updatedData, amount: Number(updatedData.amount || tx.amount) } : tx))
    );
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  // Customer CRUD Actions
  const addCustomer = (customerData) => {
    const newCust = {
      id: `cust-${Date.now().toString().slice(-3)}`,
      totalInvoiced: 0,
      totalPaid: 0,
      outstanding: 0,
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0],
      tags: ['New Client'],
      ...customerData,
    };
    setCustomers((prev) => [newCust, ...prev]);
    return newCust;
  };

  const updateCustomer = (id, updatedData) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updatedData } : c))
    );
  };

  const deleteCustomer = (id) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // Vendor CRUD Actions
  const addVendor = (vendorData) => {
    const newVend = {
      id: `vend-${Date.now().toString().slice(-3)}`,
      totalSpending: 0,
      lastTransactionDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      ...vendorData,
    };
    setVendors((prev) => [newVend, ...prev]);
    return newVend;
  };

  const updateVendor = (id, updatedData) => {
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updatedData } : v))
    );
  };

  const deleteVendor = (id) => {
    setVendors((prev) => prev.filter((v) => v.id !== id));
  };

  // Invoice CRUD Actions
  const createInvoice = (invoiceData) => {
    const newInv = {
      id: invoiceData.id || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      issueDate: invoiceData.issueDate || new Date().toISOString().split('T')[0],
      status: invoiceData.status || 'Pending',
      amountPaid: 0,
      payments: [],
      ...invoiceData,
    };

    setInvoices((prev) => [newInv, ...prev]);

    // Update customer's invoiced & outstanding total
    if (newInv.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === newInv.customerId
            ? {
                ...c,
                totalInvoiced: c.totalInvoiced + (newInv.total || 0),
                outstanding: c.outstanding + (newInv.balanceDue || newInv.total || 0),
              }
            : c
        )
      );
    }

    return newInv;
  };

  const updateInvoice = (id, updatedData) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, ...updatedData } : inv))
    );
  };

  const deleteInvoice = (id) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  const recordPayment = (invoiceId, paymentData) => {
    const paymentAmount = Number(paymentData.amount) || 0;
    const newPaymentRecord = {
      id: `pmt-${Date.now().toString().slice(-4)}`,
      date: paymentData.date || new Date().toISOString().split('T')[0],
      amount: paymentAmount,
      method: paymentData.method || 'Bank Transfer',
      reference: paymentData.reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: paymentData.notes || '',
    };

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const newAmountPaid = (Number(inv.amountPaid) || 0) + paymentAmount;
          const newBalanceDue = Math.max(0, (Number(inv.total) || 0) - newAmountPaid);
          const newStatus = newBalanceDue <= 0 ? 'Paid' : 'Partially Paid';

          return {
            ...inv,
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            status: newStatus,
            payments: [...(inv.payments || []), newPaymentRecord],
          };
        }
        return inv;
      })
    );

    // Also add to transactions log as Income
    const targetInvoice = invoices.find((i) => i.id === invoiceId);
    if (targetInvoice) {
      addTransaction({
        description: `Payment for Invoice #${targetInvoice.id} (${targetInvoice.customerName})`,
        category: 'Client Retainer',
        type: 'Income',
        amount: paymentAmount,
        date: newPaymentRecord.date,
        paymentMethod: newPaymentRecord.method,
        reference: newPaymentRecord.reference,
        entityName: targetInvoice.customerName,
        notes: `Recorded against invoice ${targetInvoice.id}`,
      });

      // Update customer outstanding
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === targetInvoice.customerId
            ? {
                ...c,
                totalPaid: c.totalPaid + paymentAmount,
                outstanding: Math.max(0, c.outstanding - paymentAmount),
              }
            : c
        )
      );
    }

    return newPaymentRecord;
  };

  const markInvoiceStatus = (invoiceId, status) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          if (status === 'Paid') {
            return {
              ...inv,
              status: 'Paid',
              amountPaid: inv.total,
              balanceDue: 0,
            };
          }
          return { ...inv, status };
        }
        return inv;
      })
    );
  };

  // Notifications Actions
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!localStorage.getItem('finai_token')) {
      return;
    }
    try {
      const res = await notificationsApi.getNotifications(1, 50);
      if (res && res.items) {
        setNotifications(res.items);
        setUnreadCount(res.unread_count || 0);
      }
    } catch (e) {
      console.warn('Backend notifications unavailable, retaining local state', e);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markNotificationRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await notificationsApi.markRead(id);
    } catch (e) {
      console.error('Failed to mark notification read on backend', e);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch (e) {
      console.error('Failed to mark all notifications read on backend', e);
    }
  };

  const deleteNotification = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationsApi.deleteNotification(id);
      fetchNotifications();
    } catch (e) {
      console.error('Failed to delete notification on backend', e);
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await notificationsApi.clearAll();
    } catch (e) {
      console.error('Failed to clear all notifications on backend', e);
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        invoices,
        customers,
        vendors,
        notifications,
        unreadCount,
        currency,
        setCurrency,
        financialSummary,
        invoiceSummary,
        monthlyCashFlowData,
        expenseCategoryBreakdown,
        incomeCategoryBreakdown,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addVendor,
        updateVendor,
        deleteVendor,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        recordPayment,
        markInvoiceStatus,
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => useContext(FinanceContext);
