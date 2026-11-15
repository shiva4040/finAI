from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    categories,
    transactions,
    income,
    expenses,
    customers,
    vendors,
    invoices,
    payments,
    dashboard,
    reports,
    notifications,
    settings,
    assistant,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(categories.router)
api_router.include_router(transactions.router)
api_router.include_router(income.router)
api_router.include_router(expenses.router)
api_router.include_router(customers.router)
api_router.include_router(vendors.router)
api_router.include_router(invoices.router)
api_router.include_router(payments.router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)
api_router.include_router(notifications.router)
api_router.include_router(settings.router)
api_router.include_router(assistant.router)
