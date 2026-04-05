from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, ForeignKey, DateTime, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)

    name = Column(String, nullable=False)
    description = Column(String, default="")
    price = Column(Float, nullable=False)
    image_url = Column(String, default="")
    section = Column(String, default="General")  # Cold Beverages | Tiffins | Meals | Snacks etc.

    is_available = Column(Boolean, default=True)

    # NEW: Estimated prep time for AI Order Queue Distribution (in minutes)
    prep_time = Column(Integer, default=5)

    # Time availability
    is_timed = Column(Boolean, default=False)        # False = available 24/7
    available_from = Column(String, default="00:00") # "07:00"
    available_until = Column(String, default="23:59")# "11:00"

    # Variants: {"size": ["small","large"]} or {}
    variants = Column(JSON, default={})
    # Addons: [{"name":"Extra Sugar","price":5}]
    addons = Column(JSON, default=[])

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    shop = relationship("Shop", back_populates="items")