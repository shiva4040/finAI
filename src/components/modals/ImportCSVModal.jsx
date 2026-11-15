import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { financeApi } from '../../api/finance';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Download,
  Table,
  Check,
  RefreshCw,
} from 'lucide-react';

export const ImportCSVModal = ({ isOpen, onClose, onImportSuccess }) => {
  const { fetchTransactions, fetchFinancialSummary, fetchNotifications } = useFinance();
  const { showToast } = useToast();

  // Wizard Step: 1: File, 2: Preview & Mapping, 3: Review & Import, 4: Results
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Preview Data from Backend
  const [previewData, setPreviewData] = useState(null);

  // Column Mapping
  const [mapping, setMapping] = useState({
    date: '',
    description: '',
    amount: '',
    type: '',
    category: '',
    payment_method: '',
    reference: '',
    default_type: 'expense',
    default_currency: 'INR',
  });

  // Import Result
  const [importResult, setImportResult] = useState(null);

  const fileInputRef = useRef(null);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setIsLoading(false);
    setMapping({
      date: '',
      description: '',
      amount: '',
      type: '',
      category: '',
      payment_method: '',
      reference: '',
      default_type: 'expense',
      default_currency: 'INR',
    });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv') && !selectedFile.name.toLowerCase().endsWith('.txt')) {
      showToast({
        title: 'Invalid File Format',
        message: 'Please select a valid .csv file.',
        type: 'error',
      });
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      showToast({
        title: 'File Too Large',
        message: 'Maximum allowed CSV file size is 5MB.',
        type: 'error',
      });
      return;
    }

    setFile(selectedFile);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const preview = await financeApi.previewCSV(formData);
      setPreviewData(preview);

      // Auto-detect mappings from headers
      const headers = preview.headers || [];
      const headersLower = headers.map((h) => h.toLowerCase());

      const findHeader = (candidates) => {
        for (const cand of candidates) {
          const idx = headersLower.findIndex((h) => h.includes(cand));
          if (idx !== -1) return headers[idx];
        }
        return '';
      };

      setMapping((prev) => ({
        ...prev,
        date: findHeader(['date', 'timestamp', 'time', 'tx_date']) || headers[0] || '',
        description: findHeader(['desc', 'narration', 'details', 'memo', 'title']) || headers[1] || '',
        amount: findHeader(['amount', 'amt', 'total', 'sum', 'value', 'price']) || headers[2] || '',
        type: findHeader(['type', 'dr_cr', 'credit_debit']) || '',
        category: findHeader(['category', 'cat', 'tag']) || '',
        payment_method: findHeader(['method', 'mode', 'channel']) || '',
        reference: findHeader(['ref', 'reference', 'txn_id', 'cheque', 'id']) || '',
      }));

      setStep(2);
    } catch (err) {
      console.error('CSV Preview Error:', err);
      showToast({
        title: 'CSV Parsing Failed',
        message: err?.message || 'Failed to parse CSV file. Ensure it is not corrupted.',
        type: 'error',
      });
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleProceedToReview = () => {
    if (!mapping.date || !mapping.description || !mapping.amount) {
      showToast({
        title: 'Required Columns Missing',
        message: 'Please map Date, Description, and Amount columns.',
        type: 'error',
      });
      return;
    }
    setStep(3);
  };

  const handleExecuteImport = async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));

      const result = await financeApi.importCSV(formData);
      setImportResult(result);
      setStep(4);

      // Refresh global finance records
      if (fetchTransactions) fetchTransactions();
      if (fetchFinancialSummary) fetchFinancialSummary();
      if (fetchNotifications) fetchNotifications();
      if (onImportSuccess) onImportSuccess(result);

      if (result.imported_count > 0) {
        showToast({
          title: 'Import Successful',
          message: `Imported ${result.imported_count} transaction(s). ${result.duplicates_skipped} duplicates skipped.`,
          type: 'success',
        });
      } else {
        showToast({
          title: 'Import Finished with Warnings',
          message: `Processed ${result.total_rows} rows: ${result.duplicates_skipped} skipped, ${result.rejected_count} rejected.`,
          type: 'warning',
        });
      }
    } catch (err) {
      console.error('CSV Import Error:', err);
      showToast({
        title: 'Import Failed',
        message: err?.message || 'Server rejected CSV import request.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadErrorCSV = () => {
    if (!importResult || !importResult.errors || importResult.errors.length === 0) return;

    const headers = ['Row Number', 'Failure Reason', 'Raw Data'];
    const rows = importResult.errors.map((e) => [
      e.row_number,
      `"${(e.reason || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(e.raw_data || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finai_import_errors_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Render Footer based on current Step
  const renderFooter = () => {
    if (step === 1) {
      return (
        <div className="flex items-center justify-end w-full">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => setStep(1)}
          >
            Change File
          </Button>
          <Button
            variant="primary"
            icon={ArrowRight}
            onClick={handleProceedToReview}
          >
            Continue to Review
          </Button>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => setStep(2)}
            disabled={isLoading}
          >
            Back to Mapping
          </Button>
          <Button
            variant="success"
            icon={Upload}
            onClick={handleExecuteImport}
            loading={isLoading}
          >
            {isLoading ? 'Importing Ledger Records...' : 'Confirm & Import Now'}
          </Button>
        </div>
      );
    }

    // Step 4: Results
    return (
      <div className="flex items-center justify-between w-full">
        {importResult?.errors && importResult.errors.length > 0 ? (
          <Button
            variant="outline"
            icon={Download}
            onClick={handleDownloadErrorCSV}
          >
            Download Error Log (.csv)
          </Button>
        ) : (
          <div />
        )}
        <Button variant="primary" onClick={handleClose}>
          Done
        </Button>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Transactions from CSV"
      subtitle="Safely batch-import banking statements and ledger records with automatic delimiter & duplicate detection"
      size="2xl"
      footer={renderFooter()}
    >
      {/* Step Indicators */}
      <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3 px-1 text-xs font-medium">
        <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-[11px]">1</span>
          <span>Upload File</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
        <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-[11px]">2</span>
          <span>Map Columns</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
        <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-[11px]">3</span>
          <span>Review</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
        <div className={`flex items-center gap-1.5 ${step === 4 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-[11px]">4</span>
          <span>Results</span>
        </div>
      </div>

      {/* STEP 1: FILE SELECTION */}
      {step === 1 && (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />

            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-glass">
              <Upload className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                Drag and drop your financial CSV file here
              </p>
              <p className="text-xs text-slate-400 mt-1">
                or click to browse from local computer (.csv, maximum 5MB)
              </p>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                Auto Delimiter (Comma, Semicolon, Tab)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                UTF-8 / BOM / Latin-1
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-300">File Preparation Guidelines:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Header row must contain column labels (e.g. Date, Description, Amount).</li>
              <li>Amounts can be positive or negative; currency symbols (₹, $, €) are automatically stripped.</li>
              <li>Dates in ISO (YYYY-MM-DD), DD/MM/YYYY, or MM/DD/YYYY are automatically handled.</li>
            </ul>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & COLUMN MAPPING */}
      {step === 2 && previewData && (
        <div className="space-y-5">
          {/* File Meta Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-slate-200">{file?.name}</span>
              <span className="text-slate-500 font-mono">
                ({previewData.total_rows} rows detected)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Delimiter: "{previewData.delimiter === '\t' ? '\\t' : previewData.delimiter}"
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {previewData.encoding.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Sample Preview Table */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5" />
              Sample Rows Preview (First 5 of {previewData.total_rows})
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900/90 text-slate-200 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-mono text-[10px] text-slate-500">#</th>
                    {previewData.headers.map((h, idx) => (
                      <th key={idx} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {previewData.sample_rows.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-900/30">
                      <td className="px-3 py-1.5 font-mono text-[10px] text-slate-500">{rIdx + 1}</td>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-1.5 text-slate-300 truncate max-w-xs">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column Mapping Selectors */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Map FinAI Transaction Fields
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Transaction Date <span className="text-rose-400">*</span>
                </label>
                <select
                  value={mapping.date}
                  onChange={(e) => setMapping({ ...mapping, date: e.target.value })}
                  className="w-full h-[42px] px-3 rounded-xl glass-input text-xs text-slate-200 bg-slate-900 border border-slate-700"
                >
                  <option value="">-- Select Date Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description <span className="text-rose-400">*</span>
                </label>
                <select
                  value={mapping.description}
                  onChange={(e) => setMapping({ ...mapping, description: e.target.value })}
                  className="w-full h-[42px] px-3 rounded-xl glass-input text-xs text-slate-200 bg-slate-900 border border-slate-700"
                >
                  <option value="">-- Select Description Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Amount <span className="text-rose-400">*</span>
                </label>
                <select
                  value={mapping.amount}
                  onChange={(e) => setMapping({ ...mapping, amount: e.target.value })}
                  className="w-full h-[42px] px-3 rounded-xl glass-input text-xs text-slate-200 bg-slate-900 border border-slate-700"
                >
                  <option value="">-- Select Amount Column --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Type (Income/Expense)
                </label>
                <select
                  value={mapping.type}
                  onChange={(e) => setMapping({ ...mapping, type: e.target.value })}
                  className="w-full h-[42px] px-3 rounded-xl glass-input text-xs text-slate-200 bg-slate-900 border border-slate-700"
                >
                  <option value="">-- None (Use Default) --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category (Optional)
                </label>
                <select
                  value={mapping.category}
                  onChange={(e) => setMapping({ ...mapping, category: e.target.value })}
                  className="w-full h-[42px] px-3 rounded-xl glass-input text-xs text-slate-200 bg-slate-900 border border-slate-700"
                >
                  <option value="">-- None (General) --</option>
                  {previewData.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Default Type Fallback */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Default Fallback Type
                </label>
                <select
                  value={mapping.default_type}
                  onChange={(e) => setMapping({ ...mapping, default_type: e.target.value })}
                  className="w-full h-[42px] px-3 rounded-xl glass-input text-xs text-slate-200 bg-slate-900 border border-slate-700"
                >
                  <option value="expense">Expense (Outflow)</option>
                  <option value="income">Income (Inflow)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & CONFIRM */}
      {step === 3 && previewData && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Pre-Import Verification Summary
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block">Total Rows:</span>
                <span className="text-base font-bold text-slate-200 font-mono">
                  {previewData.total_rows}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block">Date Column:</span>
                <span className="font-semibold text-indigo-400 truncate block">
                  {mapping.date}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block">Description:</span>
                <span className="font-semibold text-indigo-400 truncate block">
                  {mapping.description}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block">Amount Column:</span>
                <span className="font-semibold text-indigo-400 truncate block">
                  {mapping.amount}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              <p className="font-semibold">Duplicate Protection Active:</p>
              <p className="text-[11px] text-emerald-400/90 mt-0.5">
                Existing transactions with the same date, amount, and description will be safely skipped to avoid ledger inflation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORT RESULTS */}
      {step === 4 && importResult && (
        <div className="space-y-4 text-center py-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto shadow-glass">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-100">Batch Import Processed</h3>
            <p className="text-xs text-slate-400 mt-1">
              Your ledger entries have been synchronized with the PostgreSQL database.
            </p>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <span className="text-slate-400 block">Imported:</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {importResult.imported_count}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <span className="text-slate-400 block">Duplicates Skipped:</span>
              <span className="text-xl font-bold text-amber-400 font-mono">
                {importResult.duplicates_skipped}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
              <span className="text-slate-400 block">Rejected / Errors:</span>
              <span className="text-xl font-bold text-rose-400 font-mono">
                {importResult.rejected_count}
              </span>
            </div>
          </div>

          {/* Error Summary if any */}
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="text-left space-y-1.5 p-3 rounded-xl bg-slate-900 border border-rose-500/30 max-h-36 overflow-y-auto">
              <p className="text-xs font-semibold text-rose-400">Rejected Rows Log:</p>
              {importResult.errors.slice(0, 10).map((err, idx) => (
                <p key={idx} className="text-[11px] text-slate-300 font-mono">
                  Row {err.row_number}: {err.reason}
                </p>
              ))}
              {importResult.errors.length > 10 && (
                <p className="text-[10px] text-slate-500">
                  + {importResult.errors.length - 10} additional errors (download CSV to view all).
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
