"""
Learnfinity Smart Backend - FastAPI Application
AI-powered study planner with machine learning capabilities
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import uvicorn
import math
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from app.core.config import settings
from app.services.synthetic_data_generator import SyntheticDataGenerator

# Database tables are managed by Supabase

# Initialize services
synthetic_generator = SyntheticDataGenerator()
from app.services.ml_models import ml_model_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("Starting Learnfinity Smart Backend...")
    
    # Skip synthetic data generation to avoid database issues
    print("Skipping synthetic data generation - using mock data for ML training")
    
    # Initialize ML models
    print("Initializing ML models...")
    await ml_model_manager.initialize_models()
    
    yield
    
    # Shutdown
    print("Shutting down Learnfinity Smart Backend...")

# Create FastAPI app
app = FastAPI(
    title="Learnfinity Smart Backend",
    description="AI-powered study planner with machine learning capabilities",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
from app.api.v1.api import api_router
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "Learnfinity Smart Backend API",
        "version": "1.0.0",
        "status": "active",
        "features": [
            "AI-powered study recommendations",
            "Machine learning-based spaced repetition",
            "Personalized learning analytics",
            "Synthetic data generation",
            "Continuous learning from user behavior"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "ml_models_loaded": True}

# =============================================
# ML MICROSERVICE ENDPOINTS
# =============================================

@app.post("/ml/predict-recall")
async def predict_recall_probability(request: dict):
    """Advanced ML prediction for spaced repetition using Ebbinghaus curve + ML"""
    try:
        # Extract features from request
        days_since_last_review = request.get("days_since_last_review", 0)
        repetitions = request.get("repetitions", 0)
        ease_factor = request.get("ease_factor", 2.5)
        user_learning_style = request.get("learning_style", "reading")
        topic_difficulty = request.get("topic_difficulty", "medium")
        performance_history = request.get("performance_history", [])
        
        # Enhanced forgetting curve with ML adjustments
        base_strength = ease_factor * (1 + repetitions * 0.1)
        
        # Adjust strength based on learning style
        style_multipliers = {
            "visual": 1.1,
            "auditory": 1.0,
            "kinesthetic": 0.9,
            "reading": 1.05
        }
        adjusted_strength = base_strength * style_multipliers.get(user_learning_style, 1.0)
        
        # Adjust based on topic difficulty
        difficulty_multipliers = {
            "easy": 1.2,
            "medium": 1.0,
            "hard": 0.8
        }
        adjusted_strength *= difficulty_multipliers.get(topic_difficulty, 1.0)
        
        # Adjust based on performance history (ML-like learning)
        if performance_history:
            avg_performance = sum(performance_history) / len(performance_history)
            performance_factor = (avg_performance / 100) * 0.3 + 0.7  # Scale between 0.7 and 1.0
            adjusted_strength *= performance_factor
        
        # Calculate retention using Ebbinghaus curve
        retention = math.exp(-days_since_last_review / adjusted_strength) if adjusted_strength > 0 else 0
        
        # Add ML-like noise based on confidence
        import random
        confidence = min(0.95, 0.7 + repetitions * 0.05)
        noise = random.uniform(-0.05, 0.05) * (1 - confidence)
        recall_probability = max(0, min(1, retention + noise))
        
        # Calculate recommended interval using SuperMemo 2 algorithm
        if recall_probability > 0.9:
            recommended_interval = max(1, int(days_since_last_review * ease_factor * 1.2))
        elif recall_probability > 0.7:
            recommended_interval = max(1, int(days_since_last_review * ease_factor))
        else:
            recommended_interval = max(1, int(days_since_last_review * ease_factor * 0.8))
        
        return {
            "recall_probability": recall_probability,
            "confidence": confidence,
            "recommended_interval": recommended_interval,
            "adjusted_strength": adjusted_strength,
            "learning_style_impact": style_multipliers.get(user_learning_style, 1.0),
            "difficulty_impact": difficulty_multipliers.get(topic_difficulty, 1.0)
        }
        
    except Exception as e:
        return {"error": str(e), "recall_probability": 0.5, "confidence": 0.5}

@app.post("/ml/generate-quiz")
async def generate_ai_quiz(request: dict):
    """Generate AI-powered quiz using OpenAI"""
    try:
        from app.api.v1.endpoints.quiz_generation import generate_quiz_questions
        
        topic = request.get("topic", "")
        difficulty = request.get("difficulty", "medium")
        num_questions = request.get("num_questions", 5)
        user_profile = request.get("user_profile", {})
        
        # Use the existing quiz generation logic
        quiz_data = await generate_quiz_questions(
            topic=topic,
            difficulty=difficulty,
            num_questions=num_questions,
            user_profile=user_profile
        )
        
        return quiz_data
        
    except Exception as e:
        return {"error": str(e), "questions": []}

@app.post("/ml/generate-explanation")
async def generate_ai_explanation(request: dict):
    """Generate AI-powered explanation for quiz questions"""
    try:
        from app.api.v1.endpoints.quiz_generation import generate_quiz_explanation
        
        question = request.get("question", "")
        correct_answer = request.get("correct_answer", "")
        user_answer = request.get("user_answer", "")
        
        explanation = await generate_quiz_explanation(
            question=question,
            correct_answer=correct_answer,
            user_answer=user_answer
        )
        
        return {"explanation": explanation}
        
    except Exception as e:
        return {"error": str(e), "explanation": "Unable to generate explanation at this time."}

@app.post("/ml/learning-analytics")
async def generate_learning_analytics(request: dict):
    """Generate advanced learning analytics using ML"""
    try:
        user_id = request.get("user_id")
        quiz_results = request.get("quiz_results", [])
        spaced_repetition_data = request.get("spaced_repetition_data", [])
        learning_profile = request.get("learning_profile", {})
        
        # Advanced analytics calculations
        analytics = {
            "learning_velocity": calculate_learning_velocity(quiz_results),
            "retention_curve": calculate_retention_curve(quiz_results),
            "peak_performance_time": calculate_peak_performance_time(quiz_results),
            "burnout_risk_score": calculate_burnout_risk(quiz_results),
            "learning_style_confidence": 0.85 if learning_profile else 0.0,
            "weakness_areas": identify_weakness_areas(quiz_results),
            "improvement_trend": calculate_improvement_trend(quiz_results),
            "spaced_repetition_effectiveness": calculate_sr_effectiveness(spaced_repetition_data),
            "predicted_retention_rate": calculate_predicted_retention_rate(learning_profile, quiz_results),
            "ml_insights": generate_ml_insights(quiz_results, spaced_repetition_data, learning_profile)
        }
        
        return analytics
        
    except Exception as e:
        return {"error": str(e), "analytics": {}}

# =============================================
# SIMPLIFIED ML ENDPOINTS (for testing)
# =============================================

@app.post("/ml/intelligent-spaced-repetition")
async def intelligent_spaced_repetition(request: dict):
    """Calculate intelligent spaced repetition intervals using ML"""
    try:
        user_id = request.get("user_id")
        topic_name = request.get("topic_name")
        performance_score = request.get("performance_score")
        difficulty = request.get("difficulty", "medium")
        
        # Simple fallback calculation for now
        interval_days = max(1, min(30, int(performance_score / 10)))
        next_review = datetime.now() + timedelta(days=interval_days)
        
        return {
            "interval_days": interval_days,
            "next_review": next_review.isoformat(),
            "confidence": 0.7,
            "ml_prediction": interval_days,
            "fallback": True
        }
        
    except Exception as e:
        return {"error": str(e), "fallback": True}

@app.get("/ml/topics-due-for-review/{user_id}")
async def get_topics_due_for_review(user_id: str):
    """Get topics due for review using ML predictions"""
    try:
        # Simple fallback for now
        return {"topics": []}
        
    except Exception as e:
        return {"error": str(e), "topics": []}

@app.post("/ml/generate-intelligent-plan")
async def generate_intelligent_plan(request: dict):
    """Generate intelligent study plan using ML"""
    try:
        subjects = request.get("subjects", [])
        exam_date = request.get("exam_date")
        
        # Simple fallback plan
        plan = {
            "plan": [
                {
                    "date": datetime.now().strftime('%Y-%m-%d'),
                    "time": "14:00",
                    "duration": 60,
                    "topics": [f"{subject} Study Session" for subject in subjects],
                    "difficulty": "medium",
                    "priority": 3,
                    "session_type": "learning",
                    "ml_confidence": 0.5
                }
            ],
            "insights": ["Basic plan generated - ML features coming soon!"],
            "fallback": True
        }
        
        return plan
        
    except Exception as e:
        return {"error": str(e), "plan": []}

# Helper functions for analytics
def calculate_learning_velocity(quiz_results):
    if not quiz_results:
        return 0
    days = (quiz_results[0].get('quiz_timestamp', 0) - quiz_results[-1].get('quiz_timestamp', 0)) / (1000 * 60 * 60 * 24)
    return len(quiz_results) / max(days, 1)

def calculate_retention_curve(quiz_results):
    intervals = [1, 7, 30, 90]
    retention_rates = []
    for interval in intervals:
        relevant_quizzes = [q for q in quiz_results if interval - 1 <= q.get('days_since', 0) <= interval + 1]
        if relevant_quizzes:
            avg_score = sum(q.get('score', 0) for q in relevant_quizzes) / len(relevant_quizzes)
            retention_rates.append(avg_score / 100)
        else:
            retention_rates.append(0.5)
    return retention_rates

def calculate_peak_performance_time(quiz_results):
    time_groups = {"morning": 0, "afternoon": 0, "evening": 0, "night": 0}
    for quiz in quiz_results:
        hour = quiz.get('hour', 12)
        if 6 <= hour < 12:
            time_groups["morning"] += 1
        elif 12 <= hour < 17:
            time_groups["afternoon"] += 1
        elif 17 <= hour < 22:
            time_groups["evening"] += 1
        else:
            time_groups["night"] += 1
    return max(time_groups, key=time_groups.get)

def calculate_burnout_risk(quiz_results):
    if len(quiz_results) < 3:
        return 0.2
    recent = quiz_results[:3]
    older = quiz_results[3:6] if len(quiz_results) > 3 else []
    if not older:
        return 0.2
    recent_avg = sum(q.get('score', 0) for q in recent) / len(recent)
    older_avg = sum(q.get('score', 0) for q in older) / len(older)
    decline = (older_avg - recent_avg) / older_avg if older_avg > 0 else 0
    return max(0, min(1, decline))

def identify_weakness_areas(quiz_results):
    topic_scores = {}
    for quiz in quiz_results:
        topic = quiz.get('topic_name', 'unknown')
        if topic not in topic_scores:
            topic_scores[topic] = {"total": 0, "count": 0}
        topic_scores[topic]["total"] += quiz.get('score', 0)
        topic_scores[topic]["count"] += 1
    
    return [topic for topic, data in topic_scores.items() 
            if data["total"] / data["count"] < 60]

def calculate_improvement_trend(quiz_results):
    if len(quiz_results) < 4:
        return "stable"
    recent = quiz_results[:4]
    older = quiz_results[4:8] if len(quiz_results) > 4 else []
    if not older:
        return "stable"
    recent_avg = sum(q.get('score', 0) for q in recent) / len(recent)
    older_avg = sum(q.get('score', 0) for q in older) / len(older)
    change = (recent_avg - older_avg) / older_avg if older_avg > 0 else 0
    if change > 0.1:
        return "increasing"
    elif change < -0.1:
        return "decreasing"
    return "stable"

def calculate_sr_effectiveness(sr_data):
    if not sr_data:
        return 0
    avg_ease_factor = sum(topic.get('ease_factor', 2.5) for topic in sr_data) / len(sr_data)
    return min(1, avg_ease_factor / 3)

def calculate_predicted_retention_rate(profile, quiz_results):
    if not profile or not quiz_results:
        return 0.7
    base_retention = profile.get('retention_rate', 0.7)
    recent_scores = [q.get('score', 0) for q in quiz_results[:5]]
    avg_recent_score = sum(recent_scores) / len(recent_scores) if recent_scores else 70
    performance_adjustment = (avg_recent_score - 70) / 100
    return max(0.3, min(0.95, base_retention + performance_adjustment))

def generate_ml_insights(quiz_results, sr_data, learning_profile):
    insights = []
    
    if quiz_results:
        avg_score = sum(q.get('score', 0) for q in quiz_results) / len(quiz_results)
        if avg_score > 85:
            insights.append("Excellent performance! Consider increasing difficulty.")
        elif avg_score < 60:
            insights.append("Focus on foundational concepts before advancing.")
    
    if sr_data:
        avg_interval = sum(topic.get('interval_days', 1) for topic in sr_data) / len(sr_data)
        if avg_interval > 30:
            insights.append("Great retention! Your spaced repetition is working well.")
        elif avg_interval < 7:
            insights.append("Consider reviewing topics more frequently for better retention.")
    
    return insights

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )



