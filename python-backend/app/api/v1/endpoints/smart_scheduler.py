"""
Smart Scheduler Endpoints - Spaced Repetition & ML Analytics
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import math
from app.services.study_plan_generator import study_plan_generator
from app.services.gamification import gamification_system
from app.services.ml_models import ml_model_manager

from app.services.spaced_repetition import SpacedRepetitionEngine
from app.core.supabase_client import supabase_client

router = APIRouter()
sr_engine = SpacedRepetitionEngine()

class SpacedRepetitionRequest(BaseModel):
    user_id: str
    topic_name: str
    performance_score: float
    difficulty: str = "medium"

class StudyPlanRequest(BaseModel):
    user_id: str
    topics: List[str]
    target_date: str
    daily_study_time: Optional[int] = 120
    preferred_session_length: Optional[int] = 25
    difficulty_preference: Optional[str] = "medium"

@router.post("/spaced-repetition/update")
async def update_spaced_repetition(request: SpacedRepetitionRequest):
    """Update spaced repetition data using ML algorithms"""
    try:
        result = sr_engine.calculate_next_review(
            user_id=request.user_id,
            topic_name=request.topic_name,
            performance_score=request.performance_score,
            difficulty=request.difficulty
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/spaced-repetition/reviews/{user_id}")
async def get_reviews_due(user_id: str):
    """Get topics due for review based on spaced repetition algorithm"""
    try:
        reviews = sr_engine.get_topics_due_for_review(user_id)
        return {"topics": reviews}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-study-plan")
async def generate_study_plan(request: StudyPlanRequest):
    """Generate a personalized study plan using intelligent scheduling"""
    try:
        target_date = datetime.fromisoformat(request.target_date.replace('Z', '+00:00'))
        
        # Create user preferences from request
        from app.services.study_plan_generator import UserPreferences
        preferences = UserPreferences(
            daily_study_time=request.daily_study_time,
            preferred_session_length=request.preferred_session_length,
            break_duration=5,
            peak_hours=[9, 10, 11, 14, 15, 16],
            difficulty_preference=request.difficulty_preference,
            learning_style='visual',  # Default, could be from user profile
            max_sessions_per_day=6
        )
        
        study_plan = await study_plan_generator.generate_personalized_study_plan(
            user_id=request.user_id,
            topics=request.topics,
            target_date=target_date,
            preferences=preferences
        )
        
        return study_plan
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")

@router.get("/study-plan/{user_id}")
async def get_user_study_plan(user_id: str):
    """Get the current study plan for a user"""
    try:
        # This would retrieve from database - for now return a sample
        return {
            "user_id": user_id,
            "message": "Study plan retrieval endpoint - implementation needed",
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/study-plan/{user_id}/update-progress")
async def update_study_progress(user_id: str, progress_data: Dict[str, Any]):
    """Update progress on study plan and trigger adaptive adjustments"""
    try:
        # Update gamification progress
        gamification_updates = await gamification_system.update_user_progress(user_id, progress_data)
        
        return {
            "user_id": user_id,
            "progress_updated": True,
            "adaptive_adjustments": [],
            "gamification_updates": gamification_updates,
            "message": "Progress updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Gamification Endpoints
@router.get("/gamification/{user_id}")
async def get_user_gamification_data(user_id: str):
    """Get user's gamification data including streaks, badges, and achievements"""
    try:
        gamification_data = await gamification_system.get_user_gamification_data(user_id)
        return gamification_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gamification/{user_id}/activity")
async def record_user_activity(user_id: str, activity_data: Dict[str, Any]):
    """Record user activity and update gamification progress"""
    try:
        updates = await gamification_system.update_user_progress(user_id, activity_data)
        return {
            "user_id": user_id,
            "activity_recorded": True,
            "updates": updates
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ML-Powered Recommendations
@router.get("/ml-recommendations/{user_id}")
async def get_ml_recommendations(user_id: str, context: Optional[Dict[str, Any]] = None):
    """Get ML-powered study recommendations"""
    try:
        if context is None:
            context = {}
        
        recommendations = await ml_model_manager.get_intelligent_recommendations(user_id, context)
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/spaced-repetition/recommendations/{user_id}")
async def get_study_recommendations(user_id: str):
    """Generate personalized study recommendations"""
    try:
        recommendations = sr_engine.generate_study_recommendations(user_id)
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-study-plan")
async def generate_intelligent_study_plan(request: StudyPlanRequest):
    """Generate AI-powered study plan"""
    try:
        # This would integrate with the existing Node.js logic
        # For now, return a structured response
        return {
            "plan": {},
            "insights": ["Study plan generation integrated with FastAPI"],
            "ml_confidence": 0.8
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))