import os
import secrets
import json
import razorpay
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.order import Order
from app.models.menu_item import MenuItem
from app.models.shop import Shop
from app.models.worker import Worker
from app.api.websockets import manager

router = APIRouter()

def get_shop_config(shop):
    config = shop.config or {}
    if isinstance(config, str):
        try:
            config = json.loads(config.replace("'", '"').replace("True", "true").replace("False", "false"))
        except:
            config = {}
    return config

@router.post("/place")
async def place_order(payload: dict, db: Session = Depends(get_db)):
    shop = db.query(Shop).filter(Shop.slug == payload.get("shop_slug")).first()
    if not shop: raise HTTPException(404, "Shop not found")

    shop_config = get_shop_config(shop)
    
    max_prep_time = 0
    total_items = 0
    total_amount = 0

    for item_data in payload.get("items", []):
        item = db.query(MenuItem).filter(MenuItem.id == item_data["id"]).first()
        if item:
            qty = item_data.get("qty", 1)
            total_items += qty
            item_prep = getattr(item, 'prep_time', 5)
            if item_prep > max_prep_time:
                max_prep_time = item_prep
            total_amount += (item.price * qty)

    base_order_time = max_prep_time + (total_items * 1.5)
    workers = db.query(Worker).filter(Worker.shop_id == shop.id).all()
    assigned_worker_name = None
    queue_wait_time = 0

    if workers:
        worker_loads = []
        for w in workers:
            active_orders_count = db.query(func.count(Order.id)).filter(
                Order.shop_id == shop.id,
                Order.assigned_worker == w.worker_name,
                Order.status.in_(["pending", "preparing", "confirmed"])
            ).scalar() or 0
            worker_loads.append({"name": w.worker_name, "count": active_orders_count})

        best_worker = min(worker_loads, key=lambda x: x["count"])
        assigned_worker_name = best_worker["name"]
        queue_wait_time = best_worker["count"] * 4
    else:
        active_orders_count = db.query(func.count(Order.id)).filter(
            Order.shop_id == shop.id, Order.status.in_(["pending", "preparing", "confirmed"])
        ).scalar() or 0
        queue_wait_time = (active_orders_count * 4) / 2

    final_eta = int(base_order_time + queue_wait_time)
    if final_eta > 45: final_eta = 45 

    token = secrets.token_hex(3).upper()
    payment_method = payload.get("payment_method", "online")
    
    # 1. Dynamic Razorpay Integration (Bring Your Own Keys)
    rzp_order_id = f"order_{token}"
    key_id = "dummy_key"

    if payment_method == "online":
        rzp_key = shop_config.get("rzp_key_id")
        rzp_secret = shop_config.get("rzp_key_secret")
        
        if not rzp_key or not rzp_secret:
            raise HTTPException(400, "This shop has not configured online payments yet. Please use COD.")
            
        try:
            client = razorpay.Client(auth=(rzp_key, rzp_secret))
            payment = client.order.create({
                "amount": int(total_amount * 100), # Amount in paise
                "currency": "INR",
                "payment_capture": 1
            })
            rzp_order_id = payment['id']
            key_id = rzp_key
        except Exception as e:
            print(f"❌ RAZORPAY CREATE ERROR: {str(e)}")
            raise HTTPException(500, "Payment Gateway Error. Shop owner keys may be invalid.")

    new_order = Order(
        shop_id=shop.id, token=token, customer_name=payload.get("customer_name", "Guest"),
        customer_phone=payload.get("customer_phone", ""), hall_ticket=payload.get("hall_ticket", ""),
        order_type=payload.get("order_type", "dine_in"), payment_method=payment_method,
        payment_status="paid" if payment_method == "cod" else "pending",
        status="pending", total_amount=total_amount, items=payload.get("items", []),
        assigned_worker=assigned_worker_name, estimated_time=final_eta
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    if payment_method == "cod":
        await manager.broadcast(shop.slug, {"type": "new_order", "order": {"token": new_order.token, "status": new_order.status, "customer_name": new_order.customer_name, "items": new_order.items, "order_type": new_order.order_type, "total_amount": new_order.total_amount, "assigned_worker": assigned_worker_name, "estimated_time": final_eta}})

    return {
        "token": new_order.token, "amount": float(new_order.total_amount) * 100, 
        "key_id": key_id, "razorpay_order_id": rzp_order_id,
        "assigned_worker": assigned_worker_name, "estimated_time": final_eta
    }

@router.post("/verify")
async def verify_payment(payload: dict, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.token == payload.get("order_token")).first()
    if not order: raise HTTPException(404, "Order not found")
    
    shop = db.query(Shop).filter(Shop.id == order.shop_id).first()
    shop_config = get_shop_config(shop)
    
    rzp_key = shop_config.get("rzp_key_id")
    rzp_secret = shop_config.get("rzp_key_secret")
    
    if not rzp_key or not rzp_secret:
        raise HTTPException(400, "Shop payment config missing")
        
    client = razorpay.Client(auth=(rzp_key, rzp_secret))
    
    try:
        # Razorpay magically checks the signature here using math!
        client.utility.verify_payment_signature({
            'razorpay_order_id': payload.get("razorpay_order_id"),
            'razorpay_payment_id': payload.get("razorpay_payment_id"),
            'razorpay_signature': payload.get("razorpay_signature")
        })
        
        # If the code reaches here, the payment is 100% legit and secure
        order.payment_status = "paid"
        db.commit()
        
        # Tell the kitchen a new order is paid and ready to cook!
        await manager.broadcast(shop.slug, {"type": "new_order", "order": {"token": order.token, "status": order.status, "customer_name": order.customer_name, "items": order.items, "order_type": order.order_type, "total_amount": order.total_amount, "assigned_worker": order.assigned_worker, "estimated_time": order.estimated_time}})
        
        return {"status": "success"}
    except Exception as e:
        print(f"❌ RAZORPAY VERIFY ERROR: {str(e)}")
        raise HTTPException(400, "Payment verification failed or was tampered with")

@router.get("/track/{token}")
def track_order(token: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.token == token.upper()).first()
    if not order: raise HTTPException(status_code=404, detail="Order not found")
    return {
        "token": order.token, "status": order.status, "payment_status": order.payment_status,
        "total_amount": order.total_amount, "items": order.items, "customer_name": order.customer_name,
        "customer_phone": order.customer_phone, "hall_ticket": order.hall_ticket, "order_type": order.order_type,
        "created_at": order.created_at.isoformat(), "estimated_time": order.estimated_time, "assigned_worker": order.assigned_worker,
        "shop_name": order.shop.name if order.shop else "Shop"
    }

@router.get("/worker/{slug}")
def get_worker_orders(slug: str, db: Session = Depends(get_db)):
    shop = db.query(Shop).filter(Shop.slug == slug).first()
    if not shop: raise HTTPException(status_code=404, detail="Shop not found")
    orders = db.query(Order).filter(Order.shop_id == shop.id, Order.status.in_(["pending", "preparing", "confirmed"])).order_by(Order.id.desc()).all()
    return [{"token": o.token, "status": o.status, "customer_name": o.customer_name, "customer_phone": o.customer_phone, "hall_ticket": o.hall_ticket, "items": o.items, "order_type": o.order_type, "total_amount": o.total_amount, "payment_status": o.payment_status, "created_at": o.created_at.isoformat(), "assigned_worker": o.assigned_worker, "estimated_time": o.estimated_time} for o in orders]

@router.post("/worker/complete/{token}")
async def complete_order(token: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.token == token).first()
    if not order: raise HTTPException(status_code=404, detail="Order not found")
    order.status = "ready"
    db.commit()
    return {"status": "success", "token": order.token}

# --- WEBSOCKET ROUTE FOR KITCHEN DISPLAY ---
@router.websocket("/ws/{slug}")
async def websocket_endpoint(websocket: WebSocket, slug: str):
    await manager.connect(websocket, slug)
    try:
        while True:
            # Keep the connection open and listening
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, slug)