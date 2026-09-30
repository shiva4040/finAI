import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FinanceProvider } from './context/FinanceContext';
import { ToastProvider } from './context/ToastContext';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { IncomePage } from './pages/IncomePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { CreateInvoicePage } from './pages/CreateInvoicePage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { VendorsPage } from './pages/VendorsPage';
import { VendorDetailPage } from './pages/VendorDetailPage';
import { ReportsPage } from './pages/ReportsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <FinanceProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Authentication Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                {/* Authenticated Application Shell */}
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="income" element={<IncomePage />} />
                  <Route path="expenses" element={<ExpensesPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="invoices/create" element={<CreateInvoicePage />} />
                  <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="customers/:id" element={<CustomerDetailPage />} />
                  <Route path="vendors" element={<VendorsPage />} />
                  <Route path="vendors/:id" element={<VendorDetailPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="ai-assistant" element={<AIAssistantPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="settings/:tab" element={<SettingsPage />} />
                </Route>

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </FinanceProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
