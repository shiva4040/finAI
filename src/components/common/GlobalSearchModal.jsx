import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Search,
  ArrowRight,
  Receipt,
  FileText,
  Users,
  Building2,
  X,
  CornerDownLeft,
} from 'lucide-react';

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { transactions, invoices, customers, vendors, currency } = useFinance();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search logic across entities
  const q = query.toLowerCase().trim();

  const matchedTransactions = q
    ? transactions
        .filter(
          (t) =>
            t.description.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            t.paymentMethod.toLowerCase().includes(q) ||
            t.reference?.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const matchedInvoices = q
    ? invoices
        .filter(
          (i) =>
            i.id.toLowerCase().includes(q) ||
            i.customerName.toLowerCase().includes(q) ||
            i.status.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const matchedCustomers = q
    ? customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.contactPerson.toLowerCase().includes(q)
        )
        .slice(0, 3)
    : [];

  const matchedVendors = q
    ? vendors
        .filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.category.toLowerCase().includes(q) ||
            v.contactPerson.toLowerCase().includes(q)
        )
        .slice(0, 3)
    : [];

  // Flattened list for keyboard selection
  const allResults = [
    ...matchedTransactions.map((item) => ({ type: 'transaction', item, path: '/transactions' })),
    ...matchedInvoices.map((item) => ({ type: 'invoice', item, path: `/invoices/${item.id}` })),
    ...matchedCustomers.map((item) => ({ type: 'customer', item, path: `/customers/${item.id}` })),
    ...matchedVendors.map((item) => ({ type: 'vendor', item, path: `/vendors/${item.id}` })),
  ];

  const handleSelect = (result) => {
    if (!result) return;
    navigate(result.path);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < allResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        handleSelect(allResults[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-8 sm:pt-16 p-3 sm:p-4 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Search Palette Container */}
      <div
        className="relative w-full max-w-2xl glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-in z-10 flex flex-col max-h-[calc(100dvh-4rem)] m-auto"
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-100/50 dark:bg-slate-900/60 shrink-0">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, invoices, customers, vendors... (Esc to close)"
            className="w-full bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white/5 border border-white/10 rounded">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {!query && (
            <div className="py-10 text-center">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                Type something to search across transactions, invoices, customers, and vendors.
              </p>
              <div className="flex justify-center gap-2 mt-4 flex-wrap">
                {['Acme', 'AWS', 'Retainer', 'INV-2026', 'Salary'].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setQuery(chip)}
                    className="text-xs px-2.5 py-1 rounded-lg glass-subtle text-slate-400 hover:text-slate-200 hover:border-white/20 transition-colors"
                  >
                    "{chip}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && allResults.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-300">No results found for "{query}"</p>
              <p className="text-xs text-slate-500 mt-1">Try searching by client name, invoice number, or category.</p>
            </div>
          )}

          {/* Transactions section */}
          {matchedTransactions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                <span>Transactions</span>
              </div>
              <div className="space-y-1 mt-1">
                {matchedTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => handleSelect({ path: '/transactions' })}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white">
                        {tx.description}
                      </p>
                      <p className="text-xs text-slate-400">
                        {tx.category} • {formatDate(tx.date)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold font-mono ${
                        tx.type === 'Income' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.type === 'Income' ? '+' : '−'}
                      {formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices section */}
          {matchedInvoices.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Invoices</span>
              </div>
              <div className="space-y-1 mt-1">
                {matchedInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => handleSelect({ path: `/invoices/${inv.id}` })}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white">
                        {inv.id} — {inv.customerName}
                      </p>
                      <p className="text-xs text-slate-400">
                        Due {formatDate(inv.dueDate)} • {inv.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold font-mono text-slate-200">
                        {formatCurrency(inv.total, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers section */}
          {matchedCustomers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Customers</span>
              </div>
              <div className="space-y-1 mt-1">
                {matchedCustomers.map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => handleSelect({ path: `/customers/${cust.id}` })}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white">
                        {cust.name}
                      </p>
                      <p className="text-xs text-slate-400">{cust.email} • {cust.contactPerson}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendors section */}
          {matchedVendors.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Vendors</span>
              </div>
              <div className="space-y-1 mt-1">
                {matchedVendors.map((vend) => (
                  <div
                    key={vend.id}
                    onClick={() => handleSelect({ path: `/vendors/${vend.id}` })}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white">
                        {vend.name}
                      </p>
                      <p className="text-xs text-slate-400">{vend.category}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-300">
                      Spent: {formatCurrency(vend.totalSpending, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> Select
            </span>
          </div>
          <span>FinAI Omnisearch</span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
