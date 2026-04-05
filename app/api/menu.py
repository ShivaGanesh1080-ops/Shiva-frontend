import os
import shutil
import secrets
import json
import cloudinary
import cloudinary.uploader
import urllib.parse
import copy
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel

from app.database import get_db
from app.models.shop import Shop
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.utils.auth import verify_password

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Owner Auth ─────────────────────────────────────────────────────────────────

def get_owner_shop(shop_slug: str, x_owner_token: str = Header(...), db: Session = Depends(get_db)):
    shop = db.query(Shop).filter(Shop.slug == shop_slug).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    try:
        username, password = x_owner_token.split(":", 1)
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid token format. Use username:password")
    if username != shop.owner_username or not verify_password(password, shop.owner_password_hash):
        raise HTTPException(status_code=403, detail="Invalid owner credentials")
    return shop

# ── Public Menu ───────────────────────────────────────────────────────────────
@router.get("/public/{slug}")
def get_public_menu(slug: str, db: Session = Depends(get_db)):
    # 1. Look for the shop and ensure it is active
    shop = db.query(Shop).filter(Shop.slug == slug, Shop.is_active == True).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop is currently offline or does not exist")

    now = datetime.now().strftime("%H:%M")
    items = db.query(MenuItem).filter(MenuItem.shop_id == shop.id, MenuItem.is_available == True).all()

    available_items = []
    for item in items:
        if not item.is_timed:
            available_items.append(item)
        elif item.available_from and item.available_until and item.available_from <= now <= item.available_until:
            available_items.append(item)

    sections: dict = {}
    for item in available_items:
        sec = item.section or "General"
        if sec not in sections:
            sections[sec] = []
            
        # 2. Safely handle PostgreSQL NULL JSON fields with (or {}) and (or [])
        sections[sec].append({
            "id": item.id, 
            "name": item.name, 
            "description": item.description or "",
            "price": item.price, 
            "image_url": item.image_url, 
            "section": sec,
            "variants": item.variants if item.variants else {}, 
            "addons": item.addons if item.addons else [], 
            "is_timed": item.is_timed,
            "available_from": item.available_from, 
            "available_until": item.available_until,
            "prep_time": getattr(item, "prep_time", 5)
        })

    return {
        "shop": { "id": shop.id, "name": shop.name, "slug": shop.slug, "shop_type": shop.shop_type, "config": shop.config or {} },
        "sections": sections, 
        "current_time": now,
    }
# ── Owner Menu Management ─────────────────────────────────────────────────────

class MenuItemCreate(BaseModel):
    name: str
    description: str = ""
    price: float
    section: str = "General"
    prep_time: int = 5   # NEW: Added for AI Queue
    is_timed: bool = False
    available_from: str = "00:00"
    available_until: str = "23:59"
    variants: dict = {}
    addons: list = []

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    section: Optional[str] = None
    prep_time: Optional[int] = None # NEW: Added for AI Queue
    is_available: Optional[bool] = None
    is_timed: Optional[bool] = None
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    variants: Optional[dict] = None
    addons: Optional[list] = None

class ConfigUpdatePayload(BaseModel):
    settings: Dict[str, Any]
    password: str

@router.get("/owner/{slug}/items")
def owner_get_items(slug: str, shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    items = db.query(MenuItem).filter(MenuItem.shop_id == shop.id).all()
    return items
@router.post("/owner/{slug}/items")
def owner_create_item(slug: str, item_data: dict, shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    new_item = MenuItem(
        shop_id=shop.id,
        name=item_data["name"],
        price=item_data["price"],
        prep_time=item_data.get("prep_time", 5),
        section=item_data.get("section", "General"),
        description=item_data.get("description", ""),
        is_available=True,
        is_timed=item_data.get("is_timed", False),
        available_from=item_data.get("available_from", "00:00"),
        available_until=item_data.get("available_until", "23:59")
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

# 🤖 AI AUTO-IMAGE GENERATION (Zero Cost) 🤖
    try:
        print(f"🚀 STARTING: Generating AI image for '{new_item.name}'...")
        
        prompt = f"Delicious appetizing professional food photography of {new_item.name}, isolated on clean background, studio lighting, highly detailed, 4k"
        safe_prompt = urllib.parse.quote(prompt)
        ai_image_url = f"https://image.pollinations.ai/prompt/{safe_prompt}?width=600&height=600&nologo=true"
        
        print(f"☁️ UPLOADING: Sending AI drawing to Cloudinary...")
        result = cloudinary.uploader.upload(ai_image_url, folder=f"shiva_os/{slug}/items")
        
        new_item.image_url = result.get("secure_url")
        db.commit()
        db.refresh(new_item)
        print(f"✅ SUCCESS: Image saved permanently at {new_item.image_url}")
        
    except Exception as e:
        print(f"❌ ❌ ❌ AI IMAGE ERROR: {str(e)} ❌ ❌ ❌")

    return new_item

@router.patch("/owner/{slug}/items/{item_id}")
def owner_update_item(slug: str, item_id: int, payload: MenuItemUpdate, shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.shop_id == shop.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, val)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/owner/{slug}/items/{item_id}")
def owner_delete_item(slug: str, item_id: int, shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.shop_id == shop.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}

@router.post("/owner/{slug}/items/{item_id}/image")
async def upload_item_image(slug: str, item_id: int, file: UploadFile = File(...), shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.shop_id == shop.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    ext = file.filename.split(".")[-1]
    filename = f"{secrets.token_hex(8)}.{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    item.image_url = f"/uploads/{filename}"
    db.commit()
    return {"image_url": item.image_url}

# ── Owner Settings & Config Updates ───────────────────────────────────────────

@router.patch("/owner/{slug}/config")
def owner_update_config(slug: str, payload: ConfigUpdatePayload, shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    if not verify_password(payload.password, shop.owner_password_hash):
        raise HTTPException(status_code=403, detail="Incorrect password. Changes not saved.")

    # Safely load the existing config
    current_config = shop.config
    if isinstance(current_config, str):
        try:
            safe_str = current_config.replace("'", '"').replace("True", "true").replace("False", "false")
            current_config = json.loads(safe_str)
            # Catch double-stringification
            if isinstance(current_config, str):
                current_config = json.loads(current_config)
        except json.JSONDecodeError:
            current_config = {}
            
    if not current_config or not isinstance(current_config, dict):
        current_config = {}

    # Create the new config payload
    new_config = copy.deepcopy(current_config)
    if "features" not in new_config:
        new_config["features"] = {}
        
    new_config["upi_id"] = payload.settings.get("upi_id", new_config.get("upi_id", ""))
    new_config["theme"] = {"mode": payload.settings.get("theme", "dark")}
    new_config["features"]["cod"] = payload.settings.get("cod_enabled", False)
    new_config["features"]["hall_ticket"] = payload.settings.get("hall_ticket_enabled", False)

    # Save as a pure Dictionary so SQLAlchemy handles it perfectly
    shop.config = new_config
    
    flag_modified(shop, "config") 
    
    db.commit()
    db.refresh(shop)
    return {"status": "success", "config": shop.config}

@router.post("/owner/{slug}/logo")
async def upload_shop_logo(slug: str, file: UploadFile = File(...), shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    ext = file.filename.split(".")[-1]
    filename = f"logo_{shop.slug}_{secrets.token_hex(4)}.{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    config = shop.config
    is_string = isinstance(config, str)
    if is_string and config:
        safe_str = config.replace("'", '"').replace("True", "true").replace("False", "false")
        try: config = json.loads(safe_str)
        except json.JSONDecodeError: config = {}
    elif not config: config = {}
        
    new_config = dict(config)
    new_config["logo_url"] = f"/uploads/{filename}"

    if is_string:
        shop.config = json.dumps(new_config)
    else:
        shop.config = new_config
        flag_modified(shop, "config")
    
    db.commit()
    return {"logo_url": new_config["logo_url"]}
from app.models.worker import Worker # Make sure this is imported at the top of menu.py

@router.post("/owner/{slug}/workers")
def owner_create_worker(slug: str, payload: dict, shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    worker_name = payload.get("worker_name")
    if not worker_name:
        raise HTTPException(status_code=400, detail="Worker name is required")
        
    new_worker = Worker(shop_id=shop.id, worker_name=worker_name)
    db.add(new_worker)
    db.commit()
    db.refresh(new_worker)
    return {"status": "success", "worker_id": new_worker.id, "worker_name": new_worker.worker_name}
# ── Dashboard & Analytics ─────────────────────────────────────────────────────

@router.get("/owner/{slug}/dashboard")
def owner_dashboard(slug: str, shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    all_orders = db.query(Order).filter(Order.shop_id == shop.id).all()
    paid = [o for o in all_orders if o.payment_status == "paid"]
    pending = [o for o in all_orders if o.status in ("pending", "confirmed", "preparing")]
    
    recent_orders = []
    sorted_orders = sorted(all_orders, key=lambda x: x.created_at or datetime.min, reverse=True)[:500]
    for o in sorted_orders:
        recent_orders.append({
            "token": o.token, "customer_name": o.customer_name, "customer_phone": o.customer_phone,
            "hall_ticket": o.hall_ticket, "status": o.status, "payment_status": o.payment_status,
            "total_amount": float(o.total_amount), "created_at": o.created_at.isoformat() if o.created_at else ""
        })

    return {
        "shop_name": shop.name, "total_orders": len(all_orders), "paid_orders": len(paid),
        "pending_orders": len(pending), "revenue": sum(float(o.total_amount) for o in paid),
        "today_orders": len([o for o in all_orders if o.created_at and o.created_at.date() == date.today()]),
        "config": shop.config, "recent_orders": recent_orders
    }

@router.get("/owner/{slug}/analytics")
def owner_analytics(slug: str, shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    db.query(Order).filter(Order.shop_id == shop.id, Order.created_at < six_months_ago).delete(synchronize_session=False)
    db.commit()

    orders = db.query(Order).filter(Order.shop_id == shop.id, Order.payment_status == "paid").all()

    now = datetime.utcnow()
    last_7_days = { (now - timedelta(days=i)).strftime("%a"): 0 for i in range(6, -1, -1) }
    last_30_days = { (now - timedelta(days=i)).strftime("%b %d"): 0 for i in range(29, -1, -1) }
    last_6_months = { (now - timedelta(days=30*i)).strftime("%B"): 0 for i in range(5, -1, -1) }

    for o in orders:
        if not o.created_at: continue
        days_old = (now - o.created_at).days
        amount = float(o.total_amount)

        if days_old < 7: 
            day_key = o.created_at.strftime("%a")
            if day_key in last_7_days: last_7_days[day_key] += amount
        if days_old < 30: 
            day_key = o.created_at.strftime("%b %d")
            if day_key in last_30_days: last_30_days[day_key] += amount
        if days_old < 180: 
            day_key = o.created_at.strftime("%B")
            if day_key in last_6_months: last_6_months[day_key] += amount

    return {
        "7d": [{"label": k, "value": v} for k, v in last_7_days.items()],
        "30d": [{"label": k, "value": v} for k, v in last_30_days.items()],
        "6m": [{"label": k, "value": v} for k, v in last_6_months.items()],
        "raw_orders": [
            { "Date": o.created_at.strftime("%Y-%m-%d %H:%M"), "OrderID": o.token, "Customer": o.customer_name, "Type": o.order_type, "Total_INR": float(o.total_amount) } for o in orders
        ]
    }
# --- WORKER & ORDER MANAGEMENT ROUTES ---

@router.get("/owner/{slug}/workers")
def owner_get_workers(slug: str, shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    workers = db.query(Worker).filter(Worker.shop_id == shop.id).all()
    return [{"id": w.id, "worker_name": w.worker_name} for w in workers]

@router.delete("/owner/{slug}/workers/{worker_id}")
def owner_delete_worker(slug: str, worker_id: int, shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.shop_id == shop.id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    # Optional: Clear assigned worker from pending orders so they go back to the pool
    db.query(Order).filter(Order.shop_id == shop.id, Order.assigned_worker == worker.worker_name).update({"assigned_worker": None})
    
    db.delete(worker)
    db.commit()
    return {"status": "deleted"}

@router.delete("/owner/{slug}/orders")
def owner_clear_orders(slug: str, shop: Shop = Depends(get_owner_shop), db: Session = Depends(get_db)):
    # Deletes ALL orders for this shop
    db.query(Order).filter(Order.shop_id == shop.id).delete(synchronize_session=False)
    db.commit()
    return {"status": "cleared"}