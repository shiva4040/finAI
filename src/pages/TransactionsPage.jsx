import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EmptyState } from '../components/common/EmptyState';
import { AddTransactionModal } from '../components/modals/AddTransactionModal';
import { AddCategoryModal } from '../components/modals/AddCategoryModal';
import { ImportCSVModal } from '../components/modals/ImportCSVModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Plus,
  Download,
  Upload,
  Layers,
  Search,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit2,
  Trash2,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';

export const TransactionsPage = () => {
  const location = useLocation();
  const { transactions, deleteTransaction, currency } = useFinance();
  const { showToast } = useToast();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState('date-desc');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    location.state?.openAddModal || false
  );
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Extract unique categories & methods for dropdowns
  const availableCategories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category).filter(Boolean));
    return Array.from(set);
  }, [transactions]);

  const availableMethods = useMemo(() => {
    const set = new Set(transactions.map((t) => t.paymentMethod).filter(Boolean));
    return Array.from(set);
  }, [transactions]);

  // Filtered & Sorted transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        searchTerm === '' ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.entityName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
      const matchesMethod = methodFilter === 'ALL' || t.paymentMethod === methodFilter;

      return matchesSearch && matchesType && matchesCategory && matchesMethod;
    }).sort((a, b) => {
      if (sortOption === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (sortOption === 'date-asc') return new Date(a.date) - new Date(b.date);
      if (sortOption === 'amount-desc') return Number(b.amount) - Number(a.amount);
      if (sortOption === 'amount-asc') return Number(a.amount) - Number(b.amount);
      return 0;
    });
  }, [transactions, searchTerm, typeFilter, categoryFilter, methodFilter, sortOption]);

  const handleDeleteConfirm = () => {
    if (deletingId) {
      deleteTransaction(deletingId);
      showToast({
        title: 'Transaction Deleted',
        message: 'The transaction has been removed from ledger.',
        type: 'info',
      });
      setDeletingId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Description', 'Category', 'Payment Method', 'Amount', 'Status', 'Reference'];
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.date,
      t.type,
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.paymentMethod,
      t.amount,
      t.status,
      t.reference || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FinAI_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      title: 'Export Generated',
      message: `Exported ${filteredTransactions.length} transactions as CSV`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
            Transactions Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete synchronized record of all inflows, outflows, and operational expenses
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Button
            variant="secondary"
            size="md"
            icon={Download}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={Upload}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import CSV
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={Layers}
            onClick={() => setIsAddCategoryModalOpen(true)}
          >
            + Category
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <GlassCard className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Search description, reference, vendor..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Types (In & Out)' },
              { value: 'Income', label: 'Income (Credit)' },
              { value: 'Expense', label: 'Expense (Debit)' },
            ]}
          />

          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Categories' },
              ...availableCategories.map((cat) => ({ value: cat, label: cat })),
            ]}
          />

          {/* Sort By */}
          <Select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            options={[
              { value: 'date-desc', label: 'Date: Newest First' },
              { value: 'date-asc', label: 'Date: Oldest First' },
              { value: 'amount-desc', label: 'Amount: Highest' },
              { value: 'amount-asc', label: 'Amount: Lowest' },
            ]}
          />
        </div>

        {/* Active Filter Indicators & Count */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Showing {filteredTransactions.length} of {transactions.length} entries</span>
          </div>
          {(searchTerm || typeFilter !== 'ALL' || categoryFilter !== 'ALL' || methodFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('ALL');
                setCategoryFilter('ALL');
                setMethodFilter('ALL');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </GlassCard>

      {/* Transaction Table */}
      <GlassCard className="p-0 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions match your criteria"
            description="Adjust your search or filters to see more ledger entries, or record a new transaction."
            actionText="Add Transaction"
            actionIcon={Plus}
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description / Entity</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'Income';
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 max-w-xs min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {isIncome ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="truncate min-w-0 flex-1">
                            <p className="font-semibold text-slate-200 group-hover:text-white truncate">
                              {tx.description}
                            </p>
                            <span className="text-[10px] text-slate-500 font-mono block truncate">
                              {tx.reference || tx.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {tx.category}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={isIncome ? 'income' : 'expense'} size="sm">
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {tx.paymentMethod}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={isIncome ? 'text-emerald-400' : 'text-slate-100'}>
                          {isIncome ? '+' : '−'}
                          {formatCurrency(tx.amount, currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge
                          variant={tx.status === 'Completed' ? 'income' : 'warning'}
                          size="sm"
                        >
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setViewingTransaction(tx)}
                            title="View Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingTransaction(tx)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(tx.id)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Transaction Details Modal */}
      {viewingTransaction && (
        <Modal
          isOpen={!!viewingTransaction}
          onClose={() => setViewingTransaction(null)}
          title="Transaction Details"
          subtitle={`Ledger Reference ID: ${viewingTransaction.id}`}
          maxWidth="max-w-lg"
          footer={
            <Button variant="secondary" onClick={() => setViewingTransaction(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl glass-subtle flex items-center justify-between">
              <div>
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">
                  Total Value
                </span>
                <h3
                  className={`text-2xl font-bold font-mono mt-1 ${
                    viewingTransaction.type === 'Income' ? 'text-emerald-400' : 'text-slate-100'
                  }`}
                >
                  {viewingTransaction.type === 'Income' ? '+' : '−'}
                  {formatCurrency(viewingTransaction.amount, currency)}
                </h3>
              </div>
              <Badge
                variant={viewingTransaction.type === 'Income' ? 'income' : 'expense'}
                size="md"
              >
                {viewingTransaction.type}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg glass-subtle">
                <span className="text-slate-400 text-[10px] uppercase">Transaction Date</span>
                <p className="font-semibold text-slate-200 mt-0.5">{formatDate(viewingTransaction.date)}</p>
              </div>
              <div className="p-3 rounded-lg glass-subtle">
                <span className="text-slate-400 text-[10px] uppercase">Payment Method</span>
                <p className="font-semibold text-slate-200 mt-0.5">{viewingTransaction.paymentMethod}</p>
              </div>
              <div className="p-3 rounded-lg glass-subtle">
                <span className="text-slate-400 text-[10px] uppercase">Ledger Category</span>
                <p className="font-semibold text-slate-200 mt-0.5">{viewingTransaction.category}</p>
              </div>
              <div className="p-3 rounded-lg glass-subtle">
                <span className="text-slate-400 text-[10px] uppercase">Reference / UTR</span>
                <p className="font-semibold font-mono text-slate-200 mt-0.5">{viewingTransaction.reference || 'N/A'}</p>
              </div>
            </div>

            {viewingTransaction.entityName && (
              <div className="p-3 rounded-lg glass-subtle">
                <span className="text-slate-400 text-[10px] uppercase">Counterparty Entity</span>
                <p className="font-semibold text-slate-200 mt-0.5">{viewingTransaction.entityName}</p>
              </div>
            )}

            {viewingTransaction.notes && (
              <div className="p-3 rounded-lg glass-subtle">
                <span className="text-slate-400 text-[10px] uppercase">Internal Ledger Notes</span>
                <p className="text-slate-300 mt-1 leading-relaxed">{viewingTransaction.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add / Edit Transaction Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {editingTransaction && (
        <AddTransactionModal
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          editItem={editingTransaction}
        />
      )}

      {/* Import CSV Modal */}
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction from the ledger? This will permanently modify your calculated cash reserves and reports."
        confirmText="Confirm Delete"
      />
    </div>
  );
};
