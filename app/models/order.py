from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from app.database import Base

def get_ist_now():
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

class Promotion(Base):
    __tablename__ = "promotions"
    id = Column(Integer, primary_key=True, index=True)
    shop_slug = Column(String, index=True) 
    code = Column(String, index=True) 
    discount_type = Column(String) 
    value = Column(Float) 
    max_discount = Column(Float, nullable=True) 
    is_active = Column(Boolean, default=True)

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    token = Column(String, unique=True, index=True)
    
    customer_name = Column(String)
    customer_phone = Column(String)
    hall_ticket = Column(String, nullable=True)
    order_type = Column(String) 
    payment_method = Column(String) 
    
    status = Column(String, default="pending")
    payment_status = Column(String, default="pending")
    total_amount = Column(Float)
    items = Column(JSON) 
    
    # --- DISCOUNT ENGINE ---
    promo_code = Column(String, nullable=True)
    discount_amount = Column(Float, default=0.0)
    final_paid_amount = Column(Float) 
    
    # --- NEW: HOTEL/TABLE ROUTING ---
    delivery_location = Column(String, nullable=True) # e.g., "Room 101" or "Table 5"
    
    # Worker Distribution & AI Time Tracking
    assigned_worker = Column(String, index=True, nullable=True) 
    estimated_time = Column(Integer, default=10)
    
    created_at = Column(DateTime, default=get_ist_now)

    shop = relationship("Shop", back_populates="orders")