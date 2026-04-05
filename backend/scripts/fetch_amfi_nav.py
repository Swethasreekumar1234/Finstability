from __future__ import annotations

import asyncio
import logging

from database.mongodb import connect_db, close_db
from database.fund_nav import ensure_fund_nav_indexes, sync_amfi_nav_data


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main() -> None:
    await connect_db()
    try:
        await ensure_fund_nav_indexes()
        await sync_amfi_nav_data()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())