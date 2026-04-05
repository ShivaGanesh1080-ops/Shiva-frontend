import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.shop import Shop
from app.models.admin import MasterAdmin
from app.utils.auth import verify_password, hash_password

router = APIRouter()

class OwnerLoginRequest(BaseModel):
    shop_slug: str
    username: str
    password: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

@router.post("/owner/login")
def owner_login(payload: OwnerLoginRequest, db: Session = Depends(get_db)):
    shop = db.query(Shop).filter(Shop.slug == payload.shop_slug).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    if shop.owner_username != payload.username:
        raise HTTPException(status_code=403, detail="Invalid credentials")
    if not verify_password(payload.password, shop.owner_password_hash):
        raise HTTPException(status_code=403, detail="Invalid credentials")
    return {
        "token": f"{payload.username}:{payload.password}",
        "shop_name": shop.name,
        "slug": shop.slug,
        "config": shop.config,
    }

@router.post("/admin/login")
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    # TEMPORARY: NO CHECK AT ALL
    # This will return success no matter what you type
    print("FORCE LOGGING IN...")
    return {"token": "shiva12-master-secret"}