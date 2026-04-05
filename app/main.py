import os
import cloudinary
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from app.database import engine, Base
from app.models import shop, menu_item, order, worker
from app.api import admin, menu, orders, auth
from app.models.admin import MasterAdmin

# Load the variables from your .env file
load_dotenv()

# ☁️ CLOUDINARY CONFIGURATION ☁️
# This tells the backend how to log into your Cloudinary account
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

Base.metadata.create_all(bind=engine)

os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="Shiva@12 OS v3 — Smart Canteen & Shop Platform",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Admin Login Schema
class AdminLogin(BaseModel):
    username: str
    password: str

# New Master Admin Login Endpoint
@app.post("/api/auth/admin/login", tags=["Auth"])
def admin_login(data: AdminLogin):
    correct_user = os.getenv("ADMIN_USERNAME", "admin")
    correct_pass = os.getenv("ADMIN_PASSWORD", "admin123")
    
    if data.username == correct_user and data.password == correct_pass:
        # Returns the master token if credentials match
        return {"token": os.getenv("MASTER_ADMIN_TOKEN", "shiva12-master-secret")}
        
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(admin.router, prefix="/api/admin", tags=["Master Admin"])
app.include_router(menu.router, prefix="/api/menu", tags=["Menu"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

@app.get("/")
def root():
    return {"status": "online", "platform": "Shiva@12 OS v3.0", "docs": "/docs"}