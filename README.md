# FinAI — AI-Powered Financial Management System

![FinAI Banner](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80)

> **Modern Financial Platform × AI Intelligence × Premium Glass UI × Minimal Swiss Design**

FinAI is a high-performance, enterprise-grade financial management system and treasury command center. Built with React, Vite, Tailwind CSS, Lucide React, and Recharts, it offers real-time ledger accounting, receivable aging, CRM client management, vendor tracking, financial reporting, and an autonomous AI copilot.

---

## Key Features

- **Executive Financial Command Center**: Real-time cash flow velocity, income vs. expense tracking, categorical burn breakdown, and predictive runway metrics.
- **Dynamic Invoicing System**: Itemized billing with automated GST/tax, discounts, subtotal, and balance-due calculations. Includes live PDF print/download previews.
- **Full Ledger Accounting & CSV Ingestion**: Categorized transactions (UPI, Bank Transfer, Stripe, Wire, Cards) with advanced multi-field filtering, sorting, sanitized CSV export, and batch CSV import with automatic delimiter/encoding detection.
- **Dedicated Independent Creation Windows**: 8 purpose-built, viewport-centered creation dialogs (`AddIncomeModal`, `AddExpenseModal`, `AddCategoryModal`, `CreateInvoiceModal`, etc.) rendered via `createPortal` with 0.00px center offset.
- **Persistent Database Notifications & High-Contrast Alerts**: Real-time notifications for income, expenses, invoices, payments, and CSV imports with bulk clear-all and solid, opaque obsidian toast alerts.
- **Client CRM & Vendor Registry**: Dedicated counterparty profiles, billing history, payment reconciliation, and receivable aging.
- **FinAI Autonomous Copilot**: Conversational intelligence querying live ledger data, answering runway, expense anomaly, and collection queries with rich Markdown rendering and tool badges.
- **Omnisearch (`⌘K` / `Ctrl+K`)**: Rapid indexed search across transactions, invoices, customers, and vendors.
- **Bimodal Glassmorphism**: Designed with intentional contrast for both **Deep Obsidian Glass** (Dark) and **Opal Swiss Glass** (Light).

---

## Tech Stack

### Frontend
* **Framework**: React 19 + Vite 8
* **Styling**: Tailwind CSS 3.4 (with customized glassmorphism surface tokens and animations)
* **Icons**: Lucide React
* **Data Visualization**: Recharts
* **Routing**: React Router v7
* **Utilities**: clsx, tailwind-merge, custom financial formatters

### Backend
* **Framework**: Python 3.11+ / FastAPI / Uvicorn
* **Database**: PostgreSQL 16 / SQLAlchemy 2.0 (Async) / Alembic Migrations
* **Validation**: Pydantic v2 & Pydantic-Settings
* **Security**: Argon2 password hashing, JWT access & refresh token rotation & revocation
* **Financial Accuracy**: Python `Decimal` and PostgreSQL `NUMERIC(18,2)` with custom money engine
* **AI Engine**: OpenAI GPT-4o-mini tool calling with user-scoped SQL queries & deterministic fallback
* **Export Engines**: ReportLab (PDF), sanitized CSV with formula injection neutralization
* **Testing**: Pytest & Pytest-Asyncio (43/43 tests passing including 11 CSV acceptance scenarios)

---

## Project Structure

```
finAI/
├── backend/                # Production FastAPI Backend
│   ├── app/
│   │   ├── main.py         # App entry point, CORS, exception handlers, probes
│   │   ├── core/           # Config, security, logging, exceptions, dependencies
│   │   ├── db/             # SQLAlchemy async engine, session, DeclarativeBase
│   │   ├── models/         # 14 SQLAlchemy ORM models with strict user ownership
│   │   ├── schemas/        # Pydantic v2 schemas for all financial entities
│   │   ├── api/v1/         # Versioned endpoints (Auth, Users, Income, Expenses,
│   │   │                   # Transactions, Invoices, Payments, Reports, AI, etc.)
│   │   ├── repositories/   # Isolated DB query repositories
│   │   ├── services/       # Business logic, financial calculations, state transitions
│   │   ├── ai/             # OpenAI function calling tools, prompts, intent safety
│   │   └── utils/          # Decimal math, PDF & CSV generators
│   ├── migrations/         # Alembic database migrations
│   ├── tests/              # Unit & integration test suites
│   ├── docker-compose.yml  # Docker configuration (PostgreSQL 16 + Backend)
│   ├── Dockerfile          # Backend container specification
│   ├── requirements.txt    # Python dependencies
│   └── alembic.ini         # Migration configuration
│
├── public/                 # Static assets & SVG Favicon
├── src/
│   ├── api/                # Centralized API service & HTTP client
│   ├── components/         # GlassCard, StatCard, Badge, Button, Input, Modal, Modals
│   ├── context/            # AuthContext, ThemeContext, FinanceContext, ToastContext
│   ├── pages/              # Dashboard, Transactions, Income, Expenses, Invoices,
│   │                       # Customers, Vendors, Reports, AI Assistant, Settings, etc.
│   ├── utils/              # Financial, currency, date, and percentage formatters
│   ├── App.jsx             # React Router routing configuration
│   └── index.css           # Glassmorphism utilities & theme tokens
├── package.json
└── README.md
```

---

## Getting Started

### 1. Start the Backend API

```bash
cd backend

# Option A: With local Python
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Option B: With Docker Compose
docker compose up -d
```

Backend API documentation will be available at:
- **Interactive Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/health`
- **Readiness Check**: `http://localhost:8000/ready`

### 2. Start the Frontend Application

```bash
# In the project root
npm install
npm run dev
```

Frontend application will be running at: `http://localhost:5173`

---

## Running Backend Automated Tests

```bash
cd backend
python -m pytest
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
