# FinAI — Backend Engineering & Platform Architecture

FinAI is a high-accuracy, full-stack AI-powered financial management system built with FastAPI, PostgreSQL/SQLAlchemy 2.0, Alembic, Pydantic v2, and OpenAI function calling.

---

## 1. Technology Stack

- **Framework**: Python 3.11+ / FastAPI / Uvicorn
- **Database**: PostgreSQL 16 / SQLAlchemy 2.0 (Async) / Alembic
- **Validation**: Pydantic v2 / Pydantic Settings
- **Security**: Argon2 password hashing / JWT access & refresh tokens
- **Financial Precision**: Python `Decimal` / PostgreSQL `NUMERIC(18,2)`
- **AI Integration**: OpenAI GPT-4o-mini tool calling
- **Export Engines**: ReportLab (PDF), Python standard CSV with injection sanitization
- **Testing**: Pytest / Pytest-Asyncio / HTTPX

---

## 2. Project Structure

```
backend/
├── app/
│   ├── main.py                     # FastAPI entry point & lifespan
│   ├── core/                       # Settings, logging, security, exceptions
│   ├── db/                         # Async SQLAlchemy engine, session, declarative Base
│   ├── models/                     # Database models (User, Transaction, Invoice, etc.)
│   ├── schemas/                    # Pydantic v2 request/response schemas
│   ├── api/v1/                     # Versioned REST API routers & endpoints
│   ├── repositories/               # Repository pattern for DB queries & isolation
│   ├── services/                   # Business logic & financial calculations
│   ├── ai/                         # OpenAI tool calling, schemas, guardrails
│   └── utils/                      # Money decimal utilities, dates, PDF/CSV generators
├── migrations/                     # Alembic migration scripts
├── tests/                          # Unit, integration, and E2E test suites
├── docker-compose.yml              # PostgreSQL and backend container setup
├── Dockerfile                      # Container definition
├── requirements.txt                # Python dependencies
├── alembic.ini                     # Migration configuration
└── .env.example                    # Environment template
```

---

## 3. Getting Started

### Local Setup

1. **Clone repository and navigate to backend**:
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment**:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Linux/macOS
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in secrets:
   ```bash
   cp .env.example .env
   ```

5. **Start PostgreSQL via Docker (if Docker is available)**:
   ```bash
   docker compose up -d db
   ```

6. **Run Database Migrations**:
   ```bash
   alembic upgrade head
   ```

7. **Start the API Server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

8. **Interactive Documentation**:
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`
   - Health Check: `http://localhost:8000/health`
   - Readiness Check: `http://localhost:8000/ready`

---

## 4. Running Tests

```bash
pytest
```

The comprehensive test suite covers all 43 unit, integration, analytics, and CSV acceptance test cases:
```bash
python -m pytest tests/ -v
```

---

## 5. CSV Batch Ingestion & Financial API Extensions

FinAI supports resilient batch CSV ingestion with automatic delimiter, encoding, and column header resolution:
- `POST /api/v1/transactions/preview-csv`: Parses headers, auto-detects delimiters (`,`, `;`, `\t`) and encoding (`utf-8`, `utf-8-sig`, `latin-1`), and returns preview rows with recommended column mappings.
- `POST /api/v1/transactions/import-csv`: Atomically imports records, handles duplicate conflicts (`skip` vs `allow`), auto-assigns or creates categories, and triggers database event notifications.
- `DELETE /api/v1/notifications/clear-all`: Purges all notifications for the authenticated user.
- `POST /api/v1/assistant/chat`: AI Assistant natural-language querying backed by SQL function-calling tools with strict Decimal precision.
