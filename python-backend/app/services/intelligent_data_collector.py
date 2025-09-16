"""
Intelligent Data Collector for Learnfinity
Continuously collects and processes user learning data for ML model training
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
from app.core.supabase_client import supabase_client

class IntelligentDataCollector:
    """
    Collects and processes user learning data to train ML models
    """
    
    def __init__(self):
        self.supabase = supabase_client.get_client()
        self.collection_interval = 300  # 5 minutes
        self.is_running = False
        
    async def start_collection(self):
        """Start continuous data collection"""
        self.is_running = True
        print("🧠 Starting intelligent data collection...")
        
        while self.is_running:
            try:
                await self.collect_user_learning_data()
                await self.process_learning_patterns()
                await self.update_user_profiles()
                await asyncio.sleep(self.collection_interval)
            except Exception as e:
                print(f"X Error in data collection: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error
    
    def stop_collection(self):
        """Stop data collection"""
        self.is_running = False
        print("🛑 Stopped intelligent data collection")
    
    async def collect_user_learning_data(self):
        """Collect comprehensive learning data from all users"""
        try:
            # Get all active users
            users_response = await self.supabase.table('profiles').select('id').execute()
            user_ids = [user['id'] for user in users_response.data]
            
            for user_id in user_ids:
                await self.collect_user_data(user_id)
                
        except Exception as e:
            print(f"X Error collecting user data: {e}")
    
    async def collect_user_data(self, user_id: str):
        """Collect detailed learning data for a specific user"""
        try:
            # Get recent quiz results
            quiz_results = await self.get_recent_quiz_results(user_id)
            
            # Get study sessions
            study_sessions = await self.get_study_sessions(user_id)
            
            # Get spaced repetition data
            sr_data = await self.get_spaced_repetition_data(user_id)
            
            # Process and store learning patterns
            learning_patterns = await self.analyze_learning_patterns(
                user_id, quiz_results, study_sessions, sr_data
            )
            
            # Store processed data
            await self.store_learning_analytics(user_id, learning_patterns)
            
        except Exception as e:
            print(f"X Error collecting data for user {user_id}: {e}")
    
    async def get_recent_quiz_results(self, user_id: str, days: int = 30):
        """Get recent quiz results for analysis"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        response = await self.supabase.table('quiz_results')\
            .select('*')\
            .eq('user_id', user_id)\
            .gte('quiz_timestamp', cutoff_date.isoformat())\
            .order('quiz_timestamp', desc=True)\
            .execute()
        
        return response.data
    
    async def get_study_sessions(self, user_id: str, days: int = 30):
        """Get study session data"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        response = await self.supabase.table('study_sessions')\
            .select('*')\
            .eq('user_id', user_id)\
            .gte('session_start', cutoff_date.isoformat())\
            .order('session_start', desc=True)\
            .execute()
        
        return response.data
    
    async def get_spaced_repetition_data(self, user_id: str):
        """Get spaced repetition data"""
        response = await self.supabase.table('spaced_repetition_data')\
            .select('*')\
            .eq('user_id', user_id)\
            .execute()
        
        return response.data
    
    async def analyze_learning_patterns(self, user_id: str, quiz_results: List, 
                                      study_sessions: List, sr_data: List) -> Dict:
        """Analyze learning patterns and extract insights"""
        
        patterns = {
            'user_id': user_id,
            'timestamp': datetime.now().isoformat(),
            'learning_velocity': self.calculate_learning_velocity(quiz_results),
            'retention_curves': self.calculate_retention_curves(quiz_results),
            'optimal_study_times': self.find_optimal_study_times(study_sessions),
            'attention_span_analysis': self.analyze_attention_span(study_sessions),
            'difficulty_preferences': self.analyze_difficulty_preferences(quiz_results),
            'learning_style_indicators': self.detect_learning_style(quiz_results, study_sessions),
            'forgetting_patterns': self.analyze_forgetting_patterns(sr_data),
            'performance_trends': self.analyze_performance_trends(quiz_results),
            'burnout_indicators': self.detect_burnout_indicators(quiz_results, study_sessions)
        }
        
        return patterns
    
    def calculate_learning_velocity(self, quiz_results: List) -> float:
        """Calculate how fast user is learning (quizzes per day)"""
        if not quiz_results:
            return 0.0
        
        # Calculate days between first and last quiz
        first_quiz = min(quiz_results, key=lambda x: x['quiz_timestamp'])
        last_quiz = max(quiz_results, key=lambda x: x['quiz_timestamp'])
        
        days = (datetime.fromisoformat(last_quiz['quiz_timestamp']) - 
                datetime.fromisoformat(first_quiz['quiz_timestamp'])).days
        
        return len(quiz_results) / max(days, 1)
    
    def calculate_retention_curves(self, quiz_results: List) -> Dict:
        """Calculate retention curves for different time intervals"""
        if not quiz_results:
            return {}
        
        # Group by topic
        topic_scores = {}
        for quiz in quiz_results:
            topic = quiz.get('topic_name', 'unknown')
            if topic not in topic_scores:
                topic_scores[topic] = []
            topic_scores[topic].append({
                'score': quiz['score'],
                'timestamp': quiz['quiz_timestamp']
            })
        
        retention_curves = {}
        for topic, scores in topic_scores.items():
            if len(scores) < 2:
                continue
                
            # Calculate retention at different intervals
            intervals = [1, 3, 7, 14, 30]  # days
            retention_rates = []
            
            for interval in intervals:
                retention_rate = self.calculate_retention_at_interval(scores, interval)
                retention_rates.append(retention_rate)
            
            retention_curves[topic] = {
                'intervals': intervals,
                'retention_rates': retention_rates,
                'decay_rate': self.calculate_decay_rate(retention_rates)
            }
        
        return retention_curves
    
    def calculate_retention_at_interval(self, scores: List, interval_days: int) -> float:
        """Calculate retention rate at specific interval"""
        if len(scores) < 2:
            return 0.5
        
        # Find scores within the interval
        base_score = scores[0]['score']
        interval_scores = []
        
        for score_data in scores[1:]:
            days_diff = (datetime.fromisoformat(score_data['timestamp']) - 
                        datetime.fromisoformat(scores[0]['timestamp'])).days
            
            if interval_days - 1 <= days_diff <= interval_days + 1:
                interval_scores.append(score_data['score'])
        
        if not interval_scores:
            return 0.5
        
        avg_score = sum(interval_scores) / len(interval_scores)
        return avg_score / base_score if base_score > 0 else 0.5
    
    def calculate_decay_rate(self, retention_rates: List[float]) -> float:
        """Calculate how fast retention decays"""
        if len(retention_rates) < 2:
            return 0.1
        
        # Simple linear regression to find decay rate
        x = np.array([1, 3, 7, 14, 30][:len(retention_rates)])
        y = np.array(retention_rates)
        
        # Calculate slope (decay rate)
        slope = np.polyfit(x, y, 1)[0]
        return abs(slope)  # Return positive decay rate
    
    def find_optimal_study_times(self, study_sessions: List) -> Dict:
        """Find when user performs best"""
        if not study_sessions:
            return {'best_hour': 14, 'best_day': 'weekday'}
        
        # Analyze by hour of day
        hourly_performance = {}
        for session in study_sessions:
            hour = datetime.fromisoformat(session['session_start']).hour
            if hour not in hourly_performance:
                hourly_performance[hour] = []
            hourly_performance[hour].append(session.get('duration', 0))
        
        # Find best hour (longest average session)
        best_hour = max(hourly_performance.keys(), 
                       key=lambda h: np.mean(hourly_performance[h]))
        
        # Analyze by day of week
        daily_performance = {}
        for session in study_sessions:
            day = datetime.fromisoformat(session['session_start']).weekday()
            if day not in daily_performance:
                daily_performance[day] = []
            daily_performance[day].append(session.get('duration', 0))
        
        best_day = max(daily_performance.keys(), 
                      key=lambda d: np.mean(daily_performance[d]))
        
        return {
            'best_hour': best_hour,
            'best_day': 'weekday' if best_day < 5 else 'weekend',
            'hourly_distribution': hourly_performance,
            'daily_distribution': daily_performance
        }
    
    def analyze_attention_span(self, study_sessions: List) -> Dict:
        """Analyze user's attention span patterns"""
        if not study_sessions:
            return {'avg_duration': 30, 'max_duration': 60, 'attention_span': 30}
        
        durations = [session.get('duration', 0) for session in study_sessions]
        
        return {
            'avg_duration': np.mean(durations),
            'max_duration': np.max(durations),
            'min_duration': np.min(durations),
            'attention_span': np.percentile(durations, 75),  # 75th percentile
            'consistency': 1 - (np.std(durations) / np.mean(durations)) if np.mean(durations) > 0 else 0
        }
    
    def analyze_difficulty_preferences(self, quiz_results: List) -> Dict:
        """Analyze what difficulty level user prefers"""
        if not quiz_results:
            return {'preferred_difficulty': 'medium', 'difficulty_tolerance': 0.5}
        
        # Group by difficulty
        difficulty_scores = {}
        for quiz in quiz_results:
            difficulty = quiz.get('difficulty', 'medium')
            if difficulty not in difficulty_scores:
                difficulty_scores[difficulty] = []
            difficulty_scores[difficulty].append(quiz['score'])
        
        # Find best performing difficulty
        avg_scores = {diff: np.mean(scores) for diff, scores in difficulty_scores.items()}
        preferred_difficulty = max(avg_scores.keys(), key=lambda d: avg_scores[d])
        
        # Calculate difficulty tolerance (how well they handle different difficulties)
        all_scores = [score for scores in difficulty_scores.values() for score in scores]
        difficulty_tolerance = 1 - (np.std(all_scores) / 100) if all_scores else 0.5
        
        return {
            'preferred_difficulty': preferred_difficulty,
            'difficulty_tolerance': difficulty_tolerance,
            'difficulty_scores': avg_scores
        }
    
    def detect_learning_style(self, quiz_results: List, study_sessions: List) -> Dict:
        """Detect user's learning style based on behavior patterns"""
        indicators = {
            'visual': 0,
            'auditory': 0,
            'kinesthetic': 0,
            'reading': 0
        }
        
        # Analyze quiz performance patterns
        if quiz_results:
            # Visual learners often perform better on diagram-based questions
            # (This would need question type data - simplified for now)
            avg_score = np.mean([q['score'] for q in quiz_results])
            if avg_score > 80:
                indicators['visual'] += 0.3
                indicators['reading'] += 0.2
        
        # Analyze study session patterns
        if study_sessions:
            # Longer sessions might indicate reading preference
            avg_duration = np.mean([s.get('duration', 0) for s in study_sessions])
            if avg_duration > 45:
                indicators['reading'] += 0.4
            elif avg_duration < 20:
                indicators['kinesthetic'] += 0.3
        
        # Determine primary learning style
        primary_style = max(indicators.keys(), key=lambda k: indicators[k])
        confidence = indicators[primary_style]
        
        return {
            'primary_style': primary_style,
            'confidence': confidence,
            'indicators': indicators
        }
    
    def analyze_forgetting_patterns(self, sr_data: List) -> Dict:
        """Analyze how user forgets information"""
        if not sr_data:
            return {'avg_retention': 0.7, 'forgetting_rate': 0.1}
        
        # Calculate average retention rates
        retention_rates = []
        forgetting_rates = []
        
        for topic_data in sr_data:
            if 'performance_history' in topic_data and topic_data['performance_history']:
                scores = [p['score'] for p in topic_data['performance_history']]
                if len(scores) > 1:
                    # Calculate retention between first and last score
                    retention = scores[-1] / scores[0] if scores[0] > 0 else 0.5
                    retention_rates.append(retention)
                    
                    # Calculate forgetting rate (how much score drops over time)
                    if len(scores) > 2:
                        forgetting_rate = (scores[0] - scores[-1]) / len(scores)
                        forgetting_rates.append(forgetting_rate)
        
        return {
            'avg_retention': np.mean(retention_rates) if retention_rates else 0.7,
            'forgetting_rate': np.mean(forgetting_rates) if forgetting_rates else 0.1,
            'retention_consistency': 1 - np.std(retention_rates) if retention_rates else 0.5
        }
    
    def analyze_performance_trends(self, quiz_results: List) -> Dict:
        """Analyze performance trends over time"""
        if len(quiz_results) < 3:
            return {'trend': 'stable', 'improvement_rate': 0}
        
        # Sort by timestamp
        sorted_quizzes = sorted(quiz_results, key=lambda x: x['quiz_timestamp'])
        scores = [q['score'] for q in sorted_quizzes]
        
        # Calculate trend
        x = np.arange(len(scores))
        slope = np.polyfit(x, scores, 1)[0]
        
        if slope > 2:
            trend = 'improving'
        elif slope < -2:
            trend = 'declining'
        else:
            trend = 'stable'
        
        return {
            'trend': trend,
            'improvement_rate': slope,
            'volatility': np.std(scores),
            'recent_avg': np.mean(scores[-3:]) if len(scores) >= 3 else np.mean(scores)
        }
    
    def detect_burnout_indicators(self, quiz_results: List, study_sessions: List) -> Dict:
        """Detect signs of burnout or fatigue"""
        burnout_score = 0
        indicators = []
        
        # Check for declining performance
        if len(quiz_results) >= 5:
            recent_scores = [q['score'] for q in quiz_results[:3]]
            older_scores = [q['score'] for q in quiz_results[3:6]]
            
            if np.mean(recent_scores) < np.mean(older_scores) - 10:
                burnout_score += 0.3
                indicators.append('declining_performance')
        
        # Check for irregular study patterns
        if study_sessions:
            durations = [s.get('duration', 0) for s in study_sessions]
            if np.std(durations) > np.mean(durations) * 0.5:
                burnout_score += 0.2
                indicators.append('irregular_study_patterns')
        
        # Check for too frequent studying (potential overwork)
        if len(study_sessions) > 10:
            recent_sessions = study_sessions[:5]
            session_dates = [datetime.fromisoformat(s['session_start']) for s in recent_sessions]
            avg_gap = np.mean([(session_dates[i] - session_dates[i+1]).days 
                             for i in range(len(session_dates)-1)])
            
            if avg_gap < 0.5:  # Less than 12 hours between sessions
                burnout_score += 0.3
                indicators.append('overstudying')
        
        return {
            'burnout_score': min(burnout_score, 1.0),
            'risk_level': 'high' if burnout_score > 0.7 else 'medium' if burnout_score > 0.4 else 'low',
            'indicators': indicators
        }
    
    async def store_learning_analytics(self, user_id: str, patterns: Dict):
        """Store processed learning patterns in database"""
        try:
            await self.supabase.table('learning_analytics').insert([{
                'user_id': user_id,
                'analytics_data': patterns,
                'created_at': datetime.now().isoformat()
            }]).execute()
            
            print(f"✅ Stored learning analytics for user {user_id}")
            
        except Exception as e:
            print(f"X Error storing analytics for user {user_id}: {e}")
    
    async def process_learning_patterns(self):
        """Process collected patterns to update ML models"""
        try:
            # Get recent analytics data
            response = await self.supabase.table('learning_analytics')\
                .select('*')\
                .gte('created_at', (datetime.now() - timedelta(hours=1)).isoformat())\
                .execute()
            
            if response.data:
                print(f"🧠 Processing {len(response.data)} learning patterns...")
                # Here we would trigger ML model retraining
                # This will be implemented in the ML service
                
        except Exception as e:
            print(f"X Error processing learning patterns: {e}")
    
    async def update_user_profiles(self):
        """Update user profiles with learned insights"""
        try:
            # Get users with recent analytics
            response = await self.supabase.table('learning_analytics')\
                .select('user_id, analytics_data')\
                .gte('created_at', (datetime.now() - timedelta(hours=1)).isoformat())\
                .execute()
            
            for analytics in response.data:
                user_id = analytics['user_id']
                data = analytics['analytics_data']
                
                # Update learning profile with new insights
                profile_update = {
                    'learning_style': data.get('learning_style_indicators', {}).get('primary_style', 'reading'),
                    'attention_span': data.get('attention_span_analysis', {}).get('attention_span', 30),
                    'difficulty_preference': data.get('difficulty_preferences', {}).get('preferred_difficulty', 'medium'),
                    'optimal_study_time': data.get('optimal_study_times', {}).get('best_hour', 14),
                    'retention_rate': data.get('forgetting_patterns', {}).get('avg_retention', 0.7),
                    'last_updated': datetime.now().isoformat()
                }
                
                await self.supabase.table('learning_profiles')\
                    .upsert([{
                        'user_id': user_id,
                        **profile_update
                    }]).execute()
                
                print(f"✅ Updated profile for user {user_id}")
                
        except Exception as e:
            print(f"X Error updating user profiles: {e}")
