from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.item import Item
from app.db.session import get_db
from app.schemas.item import ItemCreate, ItemRead

router = APIRouter(prefix="/items", tags=["items"])


@router.post("/", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
async def create_item(payload: ItemCreate, db: AsyncSession = Depends(get_db)) -> Item:
    item = Item(name=payload.name, description=payload.description)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/", response_model=list[ItemRead])
async def list_items(db: AsyncSession = Depends(get_db)) -> list[Item]:
    result = await db.execute(select(Item))
    return list(result.scalars().all())


@router.get("/{item_id}", response_model=ItemRead)
async def get_item(item_id: int, db: AsyncSession = Depends(get_db)) -> Item:
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
