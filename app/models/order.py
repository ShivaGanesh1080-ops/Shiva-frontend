from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from app.database import Base

# Bulletproof function to get exact Indian Standard Time
def get_ist_now():
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    token = Column(String, unique=True, index=True)
    
    customer_name = Column(String)
    customer_phone = Column(String)
    hall_ticket = Column(String, nullable=True)
    order_type = Column(String) # dine_in, takeaway
    payment_method = Column(String) # online, cod
    
    status = Column(String, default="pending")
    payment_status = Column(String, default="pending")
    total_amount = Column(Float)
    items = Column(JSON) 
    
    # Worker Distribution & AI Time Tracking
    assigned_worker = Column(String, index=True, nullable=True) 
    estimated_time = Column(Integer, default=10)
    
    # NOW USES INDIAN STANDARD TIME (IST)
    created_at = Column(DateTime, default=get_ist_now)

    shop = relationship("Shop", back_populates="orders")