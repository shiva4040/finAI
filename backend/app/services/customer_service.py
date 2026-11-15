from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
import math

from app.models.customer import Customer
from app.repositories.customer_repo import CustomerRepository
from app.core.exceptions import NotFoundException, BadRequestException
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerSummary


class CustomerService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = CustomerRepository(session)

    async def create_customer(self, user_id: str, data: CustomerCreate) -> Customer:
        cust = await self.repo.create(
            user_id=user_id,
            name=data.name.strip(),
            email=str(data.email).strip().lower() if data.email else None,
            phone=data.phone.strip() if data.phone else None,
            company=data.company.strip() if data.company else None,
            address=data.address.strip() if data.address else None,
            tax_number=data.tax_number.strip() if data.tax_number else None,
            notes=data.notes.strip() if data.notes else None
        )
        await self.session.commit()
        await self.session.refresh(cust)
        return cust

    async def get_customer(self, customer_id: str, user_id: str) -> Customer:
        cust = await self.repo.get_by_id(customer_id, user_id)
        if not cust:
            raise NotFoundException("Customer", customer_id)
        return cust

    async def list_customers(
        self,
        user_id: str,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        items, total = await self.repo.list_paginated(user_id=user_id, search=search, page=page, page_size=page_size)
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }

    async def update_customer(self, customer_id: str, user_id: str, data: CustomerUpdate) -> Customer:
        cust = await self.get_customer(customer_id, user_id)
        fields = {}
        if data.name is not None:
            fields["name"] = data.name.strip()
        if data.email is not None:
            fields["email"] = str(data.email).strip().lower()
        if data.phone is not None:
            fields["phone"] = data.phone.strip()
        if data.company is not None:
            fields["company"] = data.company.strip()
        if data.address is not None:
            fields["address"] = data.address.strip()
        if data.tax_number is not None:
            fields["tax_number"] = data.tax_number.strip()
        if data.notes is not None:
            fields["notes"] = data.notes.strip()

        updated = await self.repo.update(cust, **fields)
        await self.session.commit()
        await self.session.refresh(updated)
        return updated

    async def delete_customer(self, customer_id: str, user_id: str) -> None:
        cust = await self.get_customer(customer_id, user_id)
        count = await self.repo.count_invoices(customer_id, user_id)
        if count > 0:
            raise BadRequestException(
                f"Cannot delete customer '{cust.name}' because they have {count} invoice(s) on record. Archive instead."
            )
        await self.repo.archive(cust)
        await self.session.commit()

    async def get_summary(self, customer_id: str, user_id: str) -> CustomerSummary:
        await self.get_customer(customer_id, user_id)
        summary_data = await self.repo.get_summary(customer_id, user_id)
        return CustomerSummary(**summary_data)
