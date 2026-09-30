# FinAI — AI-Powered Financial Management System

![FinAI Banner](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80)

> **Modern Financial Platform × AI Intelligence × Premium Glass UI × Minimal Swiss Design**

FinAI is a high-performance, enterprise-grade financial management system and treasury command center. Built with React, Vite, Tailwind CSS, Lucide React, and Recharts, it offers real-time ledger accounting, receivable aging, CRM client management, vendor tracking, financial reporting, and an autonomous AI copilot.

---

## Key Features

- **Executive Financial Command Center**: Real-time cash flow velocity, income vs. expense tracking, categorical burn breakdown, and predictive runway metrics.
- **Dynamic Invoicing System**: Itemized billing with automated GST/tax, discounts, subtotal, and balance-due calculations. Includes live PDF print/download previews.
- **Full Ledger Accounting**: Categorized transactions (UPI, Bank Transfer, Stripe, Wire, Cards) with advanced multi-field filtering, sorting, and CSV export.
- **Client CRM & Vendor Registry**: Dedicated counterparty profiles, billing history, payment reconciliation, and receivable aging.
- **FinAI Autonomous Copilot**: Conversational intelligence querying live ledger data, answering runway, expense anomaly, and collection queries.
- **Omnisearch (`⌘K` / `Ctrl+K`)**: Rapid indexed search across transactions, invoices, customers, and vendors.
- **Bimodal Glassmorphism**: Designed with intentional contrast for both **Deep Obsidian Glass** (Dark) and **Opal Swiss Glass** (Light).

---

## Tech Stack

* **Framework**: React 19 + Vite 8
* **Styling**: Tailwind CSS 3.4 (with customized glassmorphism surface tokens and animations)
* **Icons**: Lucide React
* **Data Visualization**: Recharts
* **Routing**: React Router v7
* **Utilities**: clsx, tailwind-merge, custom financial formatters

---

## Project Structure

```
finAI/
├── public/                 # Static assets & SVG Favicon
├── src/
│   ├── components/
│   │   ├── common/         # GlassCard, StatCard, Badge, Button, Input, Modal, AIInsightCard, GlobalSearchModal
│   │   ├── layout/         # AppLayout, Sidebar, Navbar, NotificationsDropdown
│   │   └── modals/         # AddTransactionModal, AddCustomerModal, AddVendorModal, RecordPaymentModal
│   ├── context/            # AuthContext, ThemeContext, FinanceContext, ToastContext
│   ├── data/               # Centralized enterprise mock data
│   ├── pages/              # Dashboard, Transactions, Income, Expenses, Invoices, Customers, Vendors, Reports, AI Assistant, Settings, Login, Signup
│   ├── utils/              # Financial, currency, date, and percentage formatters
│   ├── App.jsx             # React Router routing configuration
│   ├── main.jsx            # Entry point
│   └── index.css           # Glassmorphism utilities & theme tokens
├── tailwind.config.js      # Color system & shadow utilities
└── vite.config.js          # Vite config
```

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/shiva4040/finAI.git
cd finAI
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### 3. Build for Production

```bash
npm run build
```

---

## Application Routes

| Route | Description |
|---|---|
| `/login` | Enterprise SSO / Credentials Sign In |
| `/signup` | Workspace Onboarding with Password Strength Meter |
| `/dashboard` | Executive Treasury Command Center |
| `/transactions` | Reconciled Ledger & CSV Export |
| `/income` | Inflow Operations & Revenue Analytics |
| `/expenses` | Burn Rate & Operational Spend Tracker |
| `/invoices` | Accounts Receivable Pipeline |
| `/invoices/create`| Itemized Invoice Generator with Real-time Calculations |
| `/invoices/:id` | Tax Voucher Detail & Payment Recording |
| `/customers` | Client CRM & Receivable Balances |
| `/customers/:id` | Customer Profile, Invoices, & Payment Ledger |
| `/vendors` | Supplier & SaaS Registry |
| `/vendors/:id` | Vendor Spend Summary & Transaction History |
| `/reports` | Executive Financial Statements & PDF Audit Export |
| `/ai-assistant` | FinAI Autonomous Intelligence Copilot |
| `/settings` | Profile, Security (2FA), Regional Preferences, & Appearance |

---

## License

MIT License © 2026 Shiva Sharma / FinAI Technologies.
