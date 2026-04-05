from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, default="")
    shop_type = Column(String, default="canteen")  # canteen | restaurant | cafeteria
    category = Column(String, default="restaurant")

    # Login credentials for owner
    owner_username = Column(String, unique=True, nullable=False)
    owner_password_hash = Column(String, nullable=False)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Config: theme, features, UPI id, etc.
    config = Column(JSON, default={
        "theme": {"primary": "#FF6B00", "bg": "#0a0a0f", "text": "#ffffff", "accent": "#f59e0b"},
        "features": {"dine_in": True, "takeaway": True, "upi_only": True, "hall_ticket": False},
        "upi_id": "shop@upi",
        "currency": "INR",
        "institution_name": ""
    })

    items = relationship("MenuItem", back_populates="shop", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="shop", cascade="all, delete-orphan")
    workers = relationship("Worker", back_populates="shop", cascade="all, delete-orphan")
