"""
Configuration settings for Learnfinity Smart Backend
"""

from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    
    # AI APIs
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    
    # Backend Integration
    NODE_BACKEND_URL: str = "http://127.0.0.1:3001"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ]
    
    # ML Model Settings
    MODEL_RETRAIN_INTERVAL_HOURS: int = 24
    MIN_USER_DATA_FOR_TRAINING: int = 100
    SYNTHETIC_DATA_SIZE: int = 10000
    
    # Redis (for caching and background tasks)
    REDIS_URL: str = "redis://localhost:6379"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Allow extra fields from .env

settings = Settings()



