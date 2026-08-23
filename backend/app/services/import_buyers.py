from __future__ import annotations

import csv
import io
import re
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ImportedBuyer, new_id

PHONE_OK = re.compile(r"\d{7,}")


def preview_csv(raw: str) -> dict:
    reader = csv.DictReader(io.StringIO(raw.strip()))
    if not reader.fieldnames or "email" not in [f.lower() for f in reader.fieldnames]:
        return {"valid": [], "errors": [{"row": 0, "error": "CSV must include an email column"}]}
    fields = {f.lower(): f for f in reader.fieldnames}
    valid: list[dict] = []
    errors: list[dict] = []
    for i, row in enumerate(reader, start=2):
        email = (row.get(fields["email"]) or "").strip().lower()
        phone = (row.get(fields.get("phone", "phone"), "") or "").strip()
        name = (row.get(fields.get("name", "name"), "") or "").strip()
        tier = (row.get(fields.get("tier", "tier"), "C") or "C").strip().upper() or "C"
        if not email or "@" not in email:
            errors.append({"row": i, "error": "invalid email", "raw": row})
            continue
        if phone and not PHONE_OK.search(re.sub(r"\D", "", phone)):
            errors.append({"row": i, "error": "malformed phone", "raw": row})
            continue
        if phone and len(re.sub(r"\D", "", phone)) < 7:
            errors.append({"row": i, "error": "malformed phone", "raw": row})
            continue
        valid.append({"email": email, "name": name, "phone": phone, "tier": tier if tier in "ABC" else "C"})
    return {"valid": valid, "errors": errors}


async def commit_import(session: AsyncSession, rows: list[dict]) -> int:
    now = datetime.now(UTC)
    n = 0
    for row in rows:
        existing = (
            await session.execute(select(ImportedBuyer).where(ImportedBuyer.email == row["email"]))
        ).scalar_one_or_none()
        if existing:
            continue
        session.add(
            ImportedBuyer(
                id=new_id(),
                email=row["email"],
                phone_e164=row.get("phone") or "",
                name=row.get("name") or "",
                tier=row.get("tier") or "C",
                imported_at=now,
            )
        )
        n += 1
    await session.commit()
    return n
