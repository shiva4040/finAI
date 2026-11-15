from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
import math

from app.models.vendor import Vendor
from app.repositories.vendor_repo import VendorRepository
from app.core.exceptions import NotFoundException
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorSummary


class VendorService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = VendorRepository(session)

    async def create_vendor(self, user_id: str, data: VendorCreate) -> Vendor:
        v = await self.repo.create(
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
        await self.session.refresh(v)
        return v

    async def get_vendor(self, vendor_id: str, user_id: str) -> Vendor:
        v = await self.repo.get_by_id(vendor_id, user_id)
        if not v:
            raise NotFoundException("Vendor", vendor_id)
        return v

    async def list_vendors(
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

    async def update_vendor(self, vendor_id: str, user_id: str, data: VendorUpdate) -> Vendor:
        v = await self.get_vendor(vendor_id, user_id)
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

        updated = await self.repo.update(v, **fields)
        await self.session.commit()
        await self.session.refresh(updated)
        return updated

    async def delete_vendor(self, vendor_id: str, user_id: str) -> None:
        v = await self.get_vendor(vendor_id, user_id)
        await self.repo.archive(v)
        await self.session.commit()

    async def get_summary(self, vendor_id: str, user_id: str) -> VendorSummary:
        await self.get_vendor(vendor_id, user_id)
        summary_data = await self.repo.get_summary(vendor_id, user_id)
        return VendorSummary(**summary_data)
