from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import os, secrets

from app.database import get_db
from app.models.shop import Shop
from app.models.order import Order
from app.models.worker import Worker
from app.models.admin import MasterAdmin
from app.utils.auth import hash_password
from app.utils.qr_generator import generate_qr_base64

router = APIRouter()

MASTER_TOKEN = os.getenv("MASTER_ADMIN_TOKEN", "shiva12-master-secret")
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")

def verify_master(x_admin_token: str = Header(...)):
    if x_admin_token != MASTER_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid master admin token")

class CreateShopRequest(BaseModel):
    name: str
    slug: str
    shop_type: str = "canteen"
    category: str = "restaurant"
    owner_username: str
    owner_password: str
    upi_id: str = "shop@upi"
    institution_name: str = ""
    hall_ticket_enabled: bool = False
    primary_color: str = "#FF6B00"

class CreateWorkerRequest(BaseModel):
    shop_id: int
    worker_name: str

# Schema for updating Admin credentials
class UpdateCredentialsRequest(BaseModel):
    new_username: Optional[str] = None
    new_password: Optional[str] = None

@router.post("/shops")
def create_shop(payload: CreateShopRequest, db: Session = Depends(get_db), _=Depends(verify_master)):
    existing = db.query(Shop).filter(Shop.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")

    shop = Shop(
        name=payload.name,
        slug=payload.slug,
        shop_type=payload.shop_type,
        category=payload.category,
        owner_username=payload.owner_username,
        owner_password_hash=hash_password(payload.owner_password),
        config={
            "theme": {"primary": payload.primary_color, "bg": "#0a0a0f", "text": "#ffffff", "accent": "#f59e0b"},
            "features": {"dine_in": True, "takeaway": True, "upi_only": True, "hall_ticket": payload.hall_ticket_enabled},
            "upi_id": payload.upi_id,
            "currency": "INR",
            "institution_name": payload.institution_name,
        }
    )
    db.add(shop)
    db.commit()
    db.refresh(shop)
    return {"status": "created", "shop_id": shop.id, "slug": shop.slug}

@router.get("/shops")
def list_shops(db: Session = Depends(get_db), _=Depends(verify_master)):
    shops = db.query(Shop).all()
    result = []
    for s in shops:
        orders = db.query(Order).filter(Order.shop_id == s.id).all()
        paid_orders = [o for o in orders if o.payment_status == "paid"]
        revenue = sum(o.total_amount for o in paid_orders)
        result.append({
            "id": s.id, "name": s.name, "slug": s.slug,
            "shop_type": s.shop_type, "is_active": s.is_active,
            "total_orders": len(orders), "paid_orders": len(paid_orders),
            "revenue": revenue,
            "config": s.config,
        })
    return result

@router.get("/shops/{shop_id}/qr-codes")
def get_qr_codes(shop_id: int, db: Session = Depends(get_db), _=Depends(verify_master)):
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return {
        "customer_qr": generate_qr_base64(f"{BASE_URL}/menu/{shop.slug}"),
        "owner_qr": generate_qr_base64(f"{BASE_URL}/owner/{shop.slug}"),
        "worker_qr": generate_qr_base64(f"{BASE_URL}/worker/{shop.slug}"),
        "customer_url": f"{BASE_URL}/menu/{shop.slug}",
        "owner_url": f"{BASE_URL}/owner/{shop.slug}",
        "worker_url": f"{BASE_URL}/worker/{shop.slug}",
    }

@router.patch("/shops/{shop_id}/toggle")
def toggle_shop(shop_id: int, db: Session = Depends(get_db), _=Depends(verify_master)):
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop.is_active = not shop.is_active
    db.commit()
    return {"is_active": shop.is_active}

@router.delete("/shops/{shop_id}")
def delete_shop(shop_id: int, db: Session = Depends(get_db), _=Depends(verify_master)):
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    db.delete(shop)
    db.commit()
    return {"status": "deleted"}

@router.post("/workers")
def create_worker(payload: CreateWorkerRequest, db: Session = Depends(get_db), _=Depends(verify_master)):
    code = secrets.token_urlsafe(8)
    worker = Worker(shop_id=payload.shop_id, name=payload.worker_name, worker_code=code)
    db.add(worker)
    db.commit()
    db.refresh(worker)
    shop = db.query(Shop).filter(Shop.id == payload.shop_id).first()
    return {
        "worker_id": worker.id,
        "worker_code": code,
        "qr": generate_qr_base64(f"{BASE_URL}/worker/{shop.slug}?code={code}"),
        "url": f"{BASE_URL}/worker/{shop.slug}?code={code}",
    }

# NEW: The route to update Master Admin credentials
@router.put("/credentials")
def update_admin_credentials(payload: UpdateCredentialsRequest, db: Session = Depends(get_db), _=Depends(verify_master)):
    admin = db.query(MasterAdmin).first()
    
    # Safety check: Seed database from .env if table is currently empty
    if not admin:
        admin = MasterAdmin(
            username=os.getenv("ADMIN_USERNAME", "shivaganesh"),
            password_hash=hash_password(os.getenv("ADMIN_PASSWORD", "Shiva@12"))
        )
        db.add(admin)
        
    if payload.new_username:
        admin.username = payload.new_username
    if payload.new_password:
        admin.password_hash = hash_password(payload.new_password)
        
    db.commit()
    return {"status": "success", "message": "Credentials updated securely in database."}