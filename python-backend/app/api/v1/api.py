"""
API Router for Learnfinity ML Microservice
"""

from fastapi import APIRouter
from app.api.v1.endpoints import smart_scheduler, quiz_generation, analytics

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(smart_scheduler.router, prefix="/smart-scheduler", tags=["smart-scheduler"])
api_router.include_router(quiz_generation.router, prefix="/quiz", tags=["quiz"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])