"""
Data Collection Service for Continuous Learning
Collects and processes user behavior data for ML model improvement
"""

import asyncio
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.core.database import get_db, User, StudySession, QuizResult, LearningProfile, SpacedRepetitionData
import pandas as pd
import numpy as np
from app.services.ml_service import MLService

class DataCollector:
    def __init__(self):
        self.is_collecting = False
        self.collection_thread = None
        self.ml_service = MLService()
        
    def start_collection(self):
        """Start background data collection"""
        if not self.is_collecting:
            self.is_collecting = True
            self.collection_thread = threading.Thread(target=self._collection_loop)
            self.collection_thread.daemon = True
            self.collection_thread.start()
            print("📊 Data collection started")
            
    def stop_collection(self):
        """Stop background data collection"""
        self.is_collecting = False
        if self.collection_thread:
            self.collection_thread.join()
        print("📊 Data collection stopped")
        
    def _collection_loop(self):
        """Main data collection loop"""
        while self.is_collecting:
            try:
                # Collect and process data
                asyncio.run(self._collect_user_behavior_data())
                asyncio.run(self._update_learning_profiles())
                asyncio.run(self._retrain_models_if_needed())
                
                # Wait before next collection cycle
                time.sleep(3600)  # Collect every hour
                
            except Exception as e:
                print(f"Error in data collection: {e}")
                time.sleep(300)  # Wait 5 minutes before retrying
                
    async def _collect_user_behavior_data(self):
        """Collect and analyze user behavior patterns"""
        db = next(get_db())
        try:
            # Get recent user activity
            recent_time = datetime.now() - timedelta(hours=24)
            
            # Collect study session data
            study_sessions = db.query(StudySession).filter(
                StudySession.created_at >= recent_time
            ).all()
            
            # Collect quiz results
            quiz_results = db.query(QuizResult).filter(
                QuizResult.quiz_timestamp >= recent_time
            ).all()
            
            # Process and store insights
            await self._process_study_patterns(study_sessions)
            await self._process_quiz_patterns(quiz_results)
            await self._detect_learning_anomalies(study_sessions, quiz_results)
            
        finally:
            db.close()
            
    async def _process_study_patterns(self, sessions: List[StudySession]):
        """Process study session patterns"""
        if not sessions:
            return
            
        # Group by user
        user_sessions = {}
        for session in sessions:
            if session.user_id not in user_sessions:
                user_sessions[session.user_id] = []
            user_sessions[session.user_id].append(session)
            
        # Analyze patterns for each user
        for user_id, user_sessions_list in user_sessions.items():
            await self._analyze_user_study_patterns(user_id, user_sessions_list)
            
    async def _analyze_user_study_patterns(self, user_id: str, sessions: List[StudySession]):
        """Analyze study patterns for a specific user"""
        if len(sessions) < 3:  # Need minimum data
            return
            
        # Calculate metrics
        total_duration = sum(s.actual_duration for s in sessions)
        avg_duration = total_duration / len(sessions)
        efficiency = sum(s.actual_duration / s.planned_duration for s in sessions) / len(sessions)
        interruption_rate = sum(s.interruptions for s in sessions) / len(sessions)
        
        # Determine optimal study duration
        optimal_duration = self._calculate_optimal_duration(sessions)
        
        # Update learning profile
        await self._update_user_learning_profile(
            user_id, 
            {
                'attention_span': optimal_duration,
                'session_efficiency': efficiency,
                'interruption_rate': interruption_rate
            }
        )
        
    def _calculate_optimal_duration(self, sessions: List[StudySession]) -> float:
        """Calculate optimal study duration based on performance"""
        if not sessions:
            return 60.0
            
        # Find sessions with best efficiency (actual/planned ratio close to 1)
        efficiencies = [s.actual_duration / s.planned_duration for s in sessions]
        best_efficiency_idx = np.argmin(np.abs(np.array(efficiencies) - 1.0))
        
        return sessions[best_efficiency_idx].planned_duration
        
    async def _process_quiz_patterns(self, quiz_results: List[QuizResult]):
        """Process quiz performance patterns"""
        if not quiz_results:
            return
            
        # Group by user
        user_quizzes = {}
        for result in quiz_results:
            if result.user_id not in user_quizzes:
                user_quizzes[result.user_id] = []
            user_quizzes[result.user_id].append(result)
            
        # Analyze patterns for each user
        for user_id, user_quizzes_list in user_quizzes.items():
            await self._analyze_user_quiz_patterns(user_id, user_quizzes_list)
            
    async def _analyze_user_quiz_patterns(self, user_id: str, quizzes: List[QuizResult]):
        """Analyze quiz patterns for a specific user"""
        if len(quizzes) < 3:  # Need minimum data
            return
            
        # Calculate metrics
        scores = [q.score for q in quizzes]
        avg_score = np.mean(scores)
        score_std = np.std(scores)
        improvement_rate = self._calculate_improvement_rate(scores)
        
        # Analyze difficulty preferences
        difficulty_scores = {}
        for quiz in quizzes:
            if quiz.difficulty not in difficulty_scores:
                difficulty_scores[quiz.difficulty] = []
            difficulty_scores[quiz.difficulty].append(quiz.score)
            
        # Find optimal difficulty
        optimal_difficulty = self._find_optimal_difficulty(difficulty_scores)
        
        # Update learning profile
        await self._update_user_learning_profile(
            user_id,
            {
                'retention_rate': avg_score / 100,
                'improvement_rate': improvement_rate,
                'score_consistency': 1 - (score_std / 100),
                'optimal_difficulty': optimal_difficulty
            }
        )
        
    def _calculate_improvement_rate(self, scores: List[int]) -> float:
        """Calculate improvement rate over time"""
        if len(scores) < 2:
            return 0.0
            
        # Split scores into first and second half
        mid = len(scores) // 2
        first_half = scores[:mid]
        second_half = scores[mid:]
        
        if not first_half or not second_half:
            return 0.0
            
        first_avg = np.mean(first_half)
        second_avg = np.mean(second_half)
        
        return (second_avg - first_avg) / first_avg if first_avg > 0 else 0.0
        
    def _find_optimal_difficulty(self, difficulty_scores: Dict[str, List[int]]) -> str:
        """Find optimal difficulty level based on performance"""
        if not difficulty_scores:
            return 'medium'
            
        # Calculate average score for each difficulty
        difficulty_avgs = {}
        for difficulty, scores in difficulty_scores.items():
            if len(scores) >= 2:  # Need minimum attempts
                difficulty_avgs[difficulty] = np.mean(scores)
                
        if not difficulty_avgs:
            return 'medium'
            
        # Find difficulty with best performance
        best_difficulty = max(difficulty_avgs, key=difficulty_avgs.get)
        return best_difficulty
        
    async def _detect_learning_anomalies(self, sessions: List[StudySession], quizzes: List[QuizResult]):
        """Detect unusual learning patterns that might indicate issues"""
        # Group by user
        user_data = {}
        
        for session in sessions:
            if session.user_id not in user_data:
                user_data[session.user_id] = {'sessions': [], 'quizzes': []}
            user_data[session.user_id]['sessions'].append(session)
            
        for quiz in quizzes:
            if quiz.user_id not in user_data:
                user_data[quiz.user_id] = {'sessions': [], 'quizzes': []}
            user_data[quiz.user_id]['quizzes'].append(quiz)
            
        # Analyze each user for anomalies
        for user_id, data in user_data.items():
            await self._check_user_anomalies(user_id, data)
            
    async def _check_user_anomalies(self, user_id: str, data: Dict[str, List]):
        """Check for learning anomalies in user data"""
        sessions = data['sessions']
        quizzes = data['quizzes']
        
        anomalies = []
        
        # Check for sudden performance drops
        if len(quizzes) >= 5:
            recent_scores = [q.score for q in quizzes[-5:]]
            if len(recent_scores) >= 3:
                recent_avg = np.mean(recent_scores)
                if recent_avg < 50:  # Below 50% average
                    anomalies.append({
                        'type': 'performance_drop',
                        'severity': 'high',
                        'description': 'Recent quiz performance has dropped significantly'
                    })
                    
        # Check for irregular study patterns
        if len(sessions) >= 5:
            durations = [s.actual_duration for s in sessions]
            duration_std = np.std(durations)
            if duration_std > np.mean(durations) * 0.5:  # High variability
                anomalies.append({
                    'type': 'irregular_study',
                    'severity': 'medium',
                    'description': 'Study session durations are highly variable'
                })
                
        # Store anomalies for potential intervention
        if anomalies:
            await self._store_learning_anomalies(user_id, anomalies)
            
    async def _store_learning_anomalies(self, user_id: str, anomalies: List[Dict]):
        """Store learning anomalies for analysis"""
        # This could be stored in a separate anomalies table
        # For now, just log them
        print(f"Learning anomalies detected for user {user_id}: {anomalies}")
        
    async def _update_learning_profiles(self):
        """Update learning profiles based on collected data"""
        db = next(get_db())
        try:
            # Get all users with recent activity
            recent_time = datetime.now() - timedelta(days=7)
            
            users = db.query(User).join(StudySession).filter(
                StudySession.created_at >= recent_time
            ).distinct().all()
            
            for user in users:
                await self._update_user_learning_profile_from_data(user.id)
                
        finally:
            db.close()
            
    async def _update_user_learning_profile_from_data(self, user_id: str):
        """Update learning profile based on collected data"""
        db = next(get_db())
        try:
            # Get user's recent data
            recent_time = datetime.now() - timedelta(days=30)
            
            sessions = db.query(StudySession).filter(
                StudySession.user_id == user_id,
                StudySession.created_at >= recent_time
            ).all()
            
            quizzes = db.query(QuizResult).filter(
                QuizResult.user_id == user_id,
                QuizResult.quiz_timestamp >= recent_time
            ).all()
            
            if not sessions and not quizzes:
                return
                
            # Calculate updated profile metrics
            profile_updates = {}
            
            if sessions:
                profile_updates['attention_span'] = np.mean([s.actual_duration for s in sessions])
                profile_updates['session_efficiency'] = np.mean([
                    s.actual_duration / s.planned_duration for s in sessions
                ])
                
            if quizzes:
                scores = [q.score for q in quizzes]
                profile_updates['retention_rate'] = np.mean(scores) / 100
                profile_updates['improvement_rate'] = self._calculate_improvement_rate(scores)
                
            # Update profile
            if profile_updates:
                profile = db.query(LearningProfile).filter(
                    LearningProfile.user_id == user_id
                ).first()
                
                if profile:
                    for key, value in profile_updates.items():
                        setattr(profile, key, value)
                    profile.updated_at = datetime.now()
                    db.commit()
                    
        finally:
            db.close()
            
    async def _update_user_learning_profile(self, user_id: str, updates: Dict[str, Any]):
        """Update specific learning profile attributes"""
        db = next(get_db())
        try:
            profile = db.query(LearningProfile).filter(
                LearningProfile.user_id == user_id
            ).first()
            
            if profile:
                for key, value in updates.items():
                    if hasattr(profile, key):
                        setattr(profile, key, value)
                profile.updated_at = datetime.now()
                db.commit()
                
        finally:
            db.close()
            
    async def _retrain_models_if_needed(self):
        """Retrain ML models if enough new data is available"""
        # Check if we have enough new data for retraining
        db = next(get_db())
        try:
            # Count recent data
            recent_time = datetime.now() - timedelta(hours=24)
            
            recent_quizzes = db.query(QuizResult).filter(
                QuizResult.quiz_timestamp >= recent_time
            ).count()
            
            recent_sessions = db.query(StudySession).filter(
                StudySession.created_at >= recent_time
            ).count()
            
            # Retrain if we have significant new data
            if recent_quizzes > 100 or recent_sessions > 50:
                print("🔄 Retraining ML models with new data...")
                await self.ml_service.initialize_models()
                
        finally:
            db.close()



