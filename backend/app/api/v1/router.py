from fastapi import APIRouter

from app.api.v1 import admin_deals, admin_users, auth, deals, desk, public

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(public.router)
api_router.include_router(auth.router)
api_router.include_router(admin_users.router)
api_router.include_router(admin_deals.router)
api_router.include_router(deals.router)
api_router.include_router(desk.router)
