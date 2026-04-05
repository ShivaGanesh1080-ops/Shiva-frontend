from sqlalchemy import Column, Integer, String
from app.database import Base

class MasterAdmin(Base):
    __tablename__ = "master_admin"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)