from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship # <--- Added missing import
from datetime import datetime
from app.database import Base

class Worker(Base):
    __tablename__ = "workers"
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"))
    
    worker_name = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # FIX: The missing relationship connecting the Worker to the Shop!
    shop = relationship("Shop")