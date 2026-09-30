import React, { useState, useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/common/GlassCard';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { AddCustomerModal } from '../components/modals/AddCustomerModal';
import { formatCurrency } from '../utils/formatters';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Building,
  Phone,
  Mail,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const CustomersPage = () => {
  const navigate = useNavigate();
  const { customers, deleteCustomer, currency } = useFinance();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // CRM Metrics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'Active').length;
  const totalOutstanding = customers.reduce(
    (sum, c) => sum + (Number(c.outstanding) || 0),
    0
  );

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const handleDeleteConfirm = () => {
    if (deletingId) {
      deleteCustomer(deletingId);
      showToast({
        title: 'Customer Removed',
        message: 'Customer profile deleted from system.',
        type: 'info',
      });
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
            Enterprise Client CRM
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage corporate client accounts, billing histories, and outstanding balances
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={UserPlus}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Customer
        </Button>
      </div>

      {/* Top CRM Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          title="Total Registered Clients"
          value={totalCustomers.toString()}
          subtitle="portfolio size"
          icon={Users}
          accentColor="indigo"
        />
        <StatCard
          title="Active Retainers"
          value={activeCustomers.toString()}
          change={`${Math.round((activeCustomers / (totalCustomers || 1)) * 100)}% active`}
          changeType="positive"
          subtitle="generating recurring ARR"
          icon={Building}
          accentColor="emerald"
        />
        <StatCard
          title="Total Outstanding Receivables"
          value={formatCurrency(totalOutstanding, currency)}
          change={totalOutstanding > 0 ? 'Aging balance' : 'Zero debt'}
          changeType={totalOutstanding > 0 ? 'negative' : 'positive'}
          subtitle="across all active client accounts"
          icon={ShieldAlert}
          accentColor="amber"
        />
      </div>

      {/* Search Bar */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by company name, contact person, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </GlassCard>

      {/* Customer CRM Table */}
      <GlassCard className="p-0 overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Add your client corporate accounts to organize automated invoices and receivables."
            actionText="Add First Customer"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Client / Brand</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Invoiced</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/customers/${cust.id}`)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {cust.name.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                            {cust.name}
                          </p>
                          <span className="text-[10px] text-slate-400">{cust.company}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-slate-300 font-medium">{cust.contactPerson}</p>
                      <p className="text-[10px] text-slate-400">{cust.email}</p>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-200 whitespace-nowrap">
                      {formatCurrency(cust.totalInvoiced, currency)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap">
                      {formatCurrency(cust.totalPaid, currency)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                      <span className={cust.outstanding > 0 ? 'text-amber-400' : 'text-slate-400'}>
                        {formatCurrency(cust.outstanding, currency)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <Badge
                        variant={cust.status === 'Active' ? 'income' : 'neutral'}
                        size="sm"
                      >
                        {cust.status}
                      </Badge>
                    </td>

                    <td
                      className="py-3.5 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <NavLink
                          to={`/customers/${cust.id}`}
                          title="View Profile"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </NavLink>
                        <button
                          onClick={() => setEditingCustomer(cust)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(cust.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Add / Edit Modals */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {editingCustomer && (
        <AddCustomerModal
          isOpen={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
          editCustomer={editingCustomer}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer Account"
        message="Are you sure you want to delete this customer? Historical invoices and transactions will remain in ledger archives."
        confirmText="Delete Customer"
      />
    </div>
  );
};
