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
import { AddVendorModal } from '../components/modals/AddVendorModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Building2,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  CreditCard,
  Calendar,
  Layers,
} from 'lucide-react';

export const VendorsPage = () => {
  const navigate = useNavigate();
  const { vendors, deleteVendor, currency } = useFinance();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Vendor Metrics
  const totalVendors = vendors.length;
  const totalSpending = vendors.reduce(
    (sum, v) => sum + (Number(v.totalSpending) || 0),
    0
  );
  const activeVendors = vendors.filter((v) => v.status === 'Active').length;

  const filteredVendors = useMemo(() => {
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);

  const handleDeleteConfirm = () => {
    if (deletingId) {
      deleteVendor(deletingId);
      showToast({
        title: 'Vendor Removed',
        message: 'Vendor has been deleted from your registry.',
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
            Vendor & Supplier Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track external SaaS tools, infrastructure providers, legal counsel, and hardware suppliers
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Vendor
        </Button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          title="Total Registered Vendors"
          value={totalVendors.toString()}
          subtitle="enterprise supplier contracts"
          icon={Building2}
          accentColor="indigo"
        />
        <StatCard
          title="Total Lifetime Spend"
          value={formatCurrency(totalSpending, currency)}
          subtitle="across all accounts"
          icon={CreditCard}
          accentColor="rose"
        />
        <StatCard
          title="Active Commercial Accounts"
          value={activeVendors.toString()}
          change={`${Math.round((activeVendors / (totalVendors || 1)) * 100)}% active`}
          changeType="positive"
          subtitle="recurring operational relationships"
          icon={Layers}
          accentColor="emerald"
        />
      </div>

      {/* Search Bar */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by vendor name, category, or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </GlassCard>

      {/* Vendor Table */}
      <GlassCard className="p-0 overflow-hidden">
        {filteredVendors.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No vendors found"
            description="Add service providers, cloud infrastructure, or software subscriptions."
            actionText="Add Vendor"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Total Spending</th>
                  <th className="py-3 px-4">Last Transaction</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredVendors.map((vend) => (
                  <tr
                    key={vend.id}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/vendors/${vend.id}`)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {vend.name.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                            {vend.name}
                          </p>
                          <span className="text-[10px] text-slate-400">{vend.company}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded-md glass-subtle text-[11px]">
                        {vend.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-slate-300 font-medium">{vend.contactPerson}</p>
                      <p className="text-[10px] text-slate-400">{vend.email}</p>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                      {formatCurrency(vend.totalSpending, currency)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {formatDate(vend.lastTransactionDate)}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <Badge
                        variant={vend.status === 'Active' ? 'income' : 'neutral'}
                        size="sm"
                      >
                        {vend.status}
                      </Badge>
                    </td>

                    <td
                      className="py-3.5 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <NavLink
                          to={`/vendors/${vend.id}`}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </NavLink>
                        <button
                          onClick={() => setEditingVendor(vend)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(vend.id)}
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
      <AddVendorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {editingVendor && (
        <AddVendorModal
          isOpen={!!editingVendor}
          onClose={() => setEditingVendor(null)}
          editVendor={editingVendor}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Vendor Record"
        message="Are you sure you want to remove this vendor? Historical expense logs with this vendor will remain preserved."
        confirmText="Delete Vendor"
      />
    </div>
  );
};
