"""
Intelligent Study Scheduler
Uses ML to create personalized study plans that adapt to user behavior
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta, time
from typing import Dict, List, Any, Optional, Tuple
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import asyncio
from app.core.supabase_client import supabase_client

class IntelligentScheduler:
    """
    ML-powered study scheduler that learns from user behavior
    """
    
    def __init__(self):
        self.supabase = supabase_client.get_client()
        self.topic_clusters = None
        self.difficulty_model = None
        self.time_preference_model = None
        
    async def generate_intelligent_plan(self, user_id: str, subjects: List[str], 
                                      exam_date: str, availability: List[str]) -> Dict:
        """
        Generate an intelligent, personalized study plan
        """
        try:
            # Get user's learning profile and analytics
            user_profile = await self.get_user_profile(user_id)
            learning_analytics = await self.get_learning_analytics(user_id)
            existing_topics = await self.get_user_topics(user_id)
            
            # Analyze user's learning patterns
            learning_patterns = await self.analyze_learning_patterns(user_id)
            
            # Generate topic clusters based on difficulty and relationships
            topic_clusters = await self.create_topic_clusters(subjects, existing_topics)
            
            # Calculate optimal study schedule
            study_schedule = await self.calculate_optimal_schedule(
                user_id, topic_clusters, exam_date, availability, 
                user_profile, learning_analytics, learning_patterns
            )
            
            # Add ML-powered insights and recommendations
            plan_insights = await self.generate_plan_insights(
                study_schedule, user_profile, learning_analytics
            )
            
            return {
                'plan': study_schedule,
                'insights': plan_insights,
                'personalization_factors': {
                    'learning_style': user_profile.get('learning_style', 'reading'),
                    'attention_span': user_profile.get('attention_span', 30),
                    'optimal_times': learning_patterns.get('optimal_study_times', {}),
                    'difficulty_preference': user_profile.get('difficulty_preference', 'medium')
                },
                'ml_confidence': self.calculate_plan_confidence(learning_analytics),
                'adaptation_strategy': self.generate_adaptation_strategy(learning_patterns)
            }
            
        except Exception as e:
            print(f"X Error generating intelligent plan: {e}")
            return await self.fallback_basic_plan(subjects, exam_date, availability)
    
    async def analyze_learning_patterns(self, user_id: str) -> Dict:
        """Analyze user's learning patterns from historical data"""
        try:
            # Get quiz results
            quiz_results = await self.get_quiz_results(user_id)
            
            # Get study sessions
            study_sessions = await self.get_study_sessions(user_id)
            
            # Get spaced repetition data
            sr_data = await self.get_spaced_repetition_data(user_id)
            
            patterns = {
                'performance_by_time': self.analyze_performance_by_time(quiz_results),
                'optimal_study_times': self.find_optimal_study_times(study_sessions),
                'attention_span_patterns': self.analyze_attention_span(study_sessions),
                'difficulty_progression': self.analyze_difficulty_progression(quiz_results),
                'topic_relationships': self.analyze_topic_relationships(quiz_results),
                'learning_velocity': self.calculate_learning_velocity(quiz_results),
                'retention_patterns': self.analyze_retention_patterns(sr_data),
                'burnout_indicators': self.detect_burnout_indicators(quiz_results, study_sessions)
            }
            
            return patterns
            
        except Exception as e:
            print(f"X Error analyzing learning patterns: {e}")
            return {}
    
    def analyze_performance_by_time(self, quiz_results: List) -> Dict:
        """Analyze performance by time of day and day of week"""
        if not quiz_results:
            return {'hourly': {}, 'daily': {}}
        
        hourly_scores = {}
        daily_scores = {}
        
        for quiz in quiz_results:
            quiz_time = datetime.fromisoformat(quiz['quiz_timestamp'])
            hour = quiz_time.hour
            day = quiz_time.weekday()
            
            if hour not in hourly_scores:
                hourly_scores[hour] = []
            hourly_scores[hour].append(quiz['score'])
            
            if day not in daily_scores:
                daily_scores[day] = []
            daily_scores[day].append(quiz['score'])
        
        # Calculate average scores
        hourly_avg = {h: np.mean(scores) for h, scores in hourly_scores.items()}
        daily_avg = {d: np.mean(scores) for d, scores in daily_scores.items()}
        
        return {
            'hourly': hourly_avg,
            'daily': daily_avg,
            'best_hour': max(hourly_avg.keys(), key=lambda h: hourly_avg[h]) if hourly_avg else 14,
            'best_day': max(daily_avg.keys(), key=lambda d: daily_avg[d]) if daily_avg else 1
        }
    
    def find_optimal_study_times(self, study_sessions: List) -> Dict:
        """Find optimal study times based on session data"""
        if not study_sessions:
            return {'best_hour': 14, 'best_day': 'weekday', 'session_length': 30}
        
        # Analyze by hour
        hourly_sessions = {}
        for session in study_sessions:
            hour = datetime.fromisoformat(session['session_start']).hour
            if hour not in hourly_sessions:
                hourly_sessions[hour] = []
            hourly_sessions[hour].append(session.get('duration', 0))
        
        # Find best hour (longest average sessions)
        best_hour = max(hourly_sessions.keys(), 
                       key=lambda h: np.mean(hourly_sessions[h])) if hourly_sessions else 14
        
        # Analyze session lengths
        durations = [s.get('duration', 0) for s in study_sessions]
        avg_duration = np.mean(durations)
        
        return {
            'best_hour': best_hour,
            'best_day': 'weekday',  # Simplified
            'session_length': int(avg_duration),
            'consistency': 1 - (np.std(durations) / avg_duration) if avg_duration > 0 else 0
        }
    
    def analyze_attention_span(self, study_sessions: List) -> Dict:
        """Analyze attention span patterns"""
        if not study_sessions:
            return {'avg_duration': 30, 'max_duration': 60, 'attention_span': 30}
        
        durations = [s.get('duration', 0) for s in study_sessions]
        
        return {
            'avg_duration': np.mean(durations),
            'max_duration': np.max(durations),
            'min_duration': np.min(durations),
            'attention_span': np.percentile(durations, 75),
            'consistency': 1 - (np.std(durations) / np.mean(durations)) if np.mean(durations) > 0 else 0
        }
    
    def analyze_difficulty_progression(self, quiz_results: List) -> Dict:
        """Analyze how user progresses through difficulty levels"""
        if not quiz_results:
            return {'progression_rate': 0.5, 'difficulty_tolerance': 0.5}
        
        # Group by difficulty
        difficulty_scores = {}
        for quiz in quiz_results:
            diff = quiz.get('difficulty', 'medium')
            if diff not in difficulty_scores:
                difficulty_scores[diff] = []
            difficulty_scores[diff].append(quiz['score'])
        
        # Calculate progression rate
        if 'easy' in difficulty_scores and 'hard' in difficulty_scores:
            easy_avg = np.mean(difficulty_scores['easy'])
            hard_avg = np.mean(difficulty_scores['hard'])
            progression_rate = (hard_avg - easy_avg) / 100
        else:
            progression_rate = 0.5
        
        # Calculate difficulty tolerance
        all_scores = [score for scores in difficulty_scores.values() for score in scores]
        difficulty_tolerance = 1 - (np.std(all_scores) / 100) if all_scores else 0.5
        
        return {
            'progression_rate': progression_rate,
            'difficulty_tolerance': difficulty_tolerance,
            'difficulty_scores': {k: np.mean(v) for k, v in difficulty_scores.items()}
        }
    
    def analyze_topic_relationships(self, quiz_results: List) -> Dict:
        """Analyze relationships between topics"""
        if not quiz_results:
            return {}
        
        # Group by topic
        topic_scores = {}
        for quiz in quiz_results:
            topic = quiz.get('topic_name', 'unknown')
            if topic not in topic_scores:
                topic_scores[topic] = []
            topic_scores[topic].append(quiz['score'])
        
        # Find topic clusters based on performance
        topics = list(topic_scores.keys())
        if len(topics) < 2:
            return {}
        
        # Calculate correlation between topics
        correlations = {}
        for i, topic1 in enumerate(topics):
            for j, topic2 in enumerate(topics[i+1:], i+1):
                scores1 = topic_scores[topic1]
                scores2 = topic_scores[topic2]
                
                # Simple correlation based on average scores
                if len(scores1) > 1 and len(scores2) > 1:
                    corr = np.corrcoef(scores1, scores2)[0, 1]
                    if not np.isnan(corr):
                        correlations[f"{topic1}-{topic2}"] = corr
        
        return {
            'topic_scores': {k: np.mean(v) for k, v in topic_scores.items()},
            'correlations': correlations,
            'weak_topics': [t for t, scores in topic_scores.items() if np.mean(scores) < 60],
            'strong_topics': [t for t, scores in topic_scores.items() if np.mean(scores) > 80]
        }
    
    def calculate_learning_velocity(self, quiz_results: List) -> float:
        """Calculate how fast user is learning"""
        if len(quiz_results) < 2:
            return 0.5
        
        # Calculate time between quizzes
        quiz_times = [datetime.fromisoformat(q['quiz_timestamp']) for q in quiz_results]
        time_diffs = [(quiz_times[i] - quiz_times[i+1]).days for i in range(len(quiz_times)-1)]
        
        if not time_diffs:
            return 0.5
        
        avg_gap = np.mean(time_diffs)
        return 1 / max(avg_gap, 1)  # Higher velocity = shorter gaps
    
    def analyze_retention_patterns(self, sr_data: List) -> Dict:
        """Analyze retention patterns from spaced repetition data"""
        if not sr_data:
            return {'avg_retention': 0.7, 'retention_consistency': 0.5}
        
        retention_rates = []
        for topic_data in sr_data:
            if 'performance_history' in topic_data and len(topic_data['performance_history']) > 1:
                scores = [p['score'] for p in topic_data['performance_history']]
                retention = scores[-1] / scores[0] if scores[0] > 0 else 0.5
                retention_rates.append(retention)
        
        if not retention_rates:
            return {'avg_retention': 0.7, 'retention_consistency': 0.5}
        
        return {
            'avg_retention': np.mean(retention_rates),
            'retention_consistency': 1 - np.std(retention_rates),
            'retention_trend': 'improving' if len(retention_rates) > 2 and retention_rates[-1] > retention_rates[0] else 'stable'
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
        
        return {
            'burnout_score': min(burnout_score, 1.0),
            'risk_level': 'high' if burnout_score > 0.7 else 'medium' if burnout_score > 0.4 else 'low',
            'indicators': indicators
        }
    
    async def create_topic_clusters(self, subjects: List[str], existing_topics: List[Dict]) -> List[Dict]:
        """Create intelligent topic clusters based on difficulty and relationships"""
        clusters = []
        
        for subject in subjects:
            # Get topics for this subject
            subject_topics = [t for t in existing_topics if t.get('subject') == subject]
            
            if not subject_topics:
                # Create basic topics if none exist
                subject_topics = await self.create_basic_topics(subject)
            
            # Cluster topics by difficulty and estimated time
            topic_clusters = self.cluster_topics_by_difficulty(subject_topics)
            
            clusters.extend(topic_clusters)
        
        return clusters
    
    async def create_basic_topics(self, subject: str) -> List[Dict]:
        """Create basic topics for a subject"""
        # This would typically use AI to generate topics from syllabus
        # For now, return basic topics
        basic_topics = [
            {'name': f'{subject} Fundamentals', 'difficulty': 'easy', 'estimated_hours': 2},
            {'name': f'{subject} Intermediate', 'difficulty': 'medium', 'estimated_hours': 3},
            {'name': f'{subject} Advanced', 'difficulty': 'hard', 'estimated_hours': 4}
        ]
        return basic_topics
    
    def cluster_topics_by_difficulty(self, topics: List[Dict]) -> List[Dict]:
        """Cluster topics by difficulty and estimated time"""
        if not topics:
            return []
        
        # Prepare features for clustering
        features = []
        for topic in topics:
            difficulty_numeric = {'easy': 1, 'medium': 2, 'hard': 3}.get(topic.get('difficulty', 'medium'), 2)
            estimated_hours = topic.get('estimated_hours', 2)
            features.append([difficulty_numeric, estimated_hours])
        
        if len(features) < 2:
            return topics
        
        # Perform clustering
        kmeans = KMeans(n_clusters=min(3, len(topics)), random_state=42)
        cluster_labels = kmeans.fit_predict(features)
        
        # Group topics by cluster
        clusters = {}
        for i, topic in enumerate(topics):
            cluster_id = cluster_labels[i]
            if cluster_id not in clusters:
                clusters[cluster_id] = []
            clusters[cluster_id].append(topic)
        
        # Convert to list of clusters
        cluster_list = []
        for cluster_id, cluster_topics in clusters.items():
            cluster_list.append({
                'cluster_id': cluster_id,
                'topics': cluster_topics,
                'difficulty_level': self.calculate_cluster_difficulty(cluster_topics),
                'total_hours': sum(t.get('estimated_hours', 0) for t in cluster_topics),
                'priority': self.calculate_cluster_priority(cluster_topics)
            })
        
        return cluster_list
    
    def calculate_cluster_difficulty(self, topics: List[Dict]) -> str:
        """Calculate overall difficulty of a cluster"""
        difficulties = [t.get('difficulty', 'medium') for t in topics]
        difficulty_counts = {'easy': 0, 'medium': 0, 'hard': 0}
        
        for diff in difficulties:
            difficulty_counts[diff] += 1
        
        return max(difficulty_counts.keys(), key=lambda k: difficulty_counts[k])
    
    def calculate_cluster_priority(self, topics: List[Dict]) -> int:
        """Calculate priority of a cluster (1-5, higher is more important)"""
        # Priority based on difficulty and estimated hours
        avg_difficulty = np.mean([{'easy': 1, 'medium': 2, 'hard': 3}.get(t.get('difficulty', 'medium'), 2) for t in topics])
        total_hours = sum(t.get('estimated_hours', 0) for t in topics)
        
        # Higher difficulty and more hours = higher priority
        priority = int(avg_difficulty + (total_hours / 10))
        return min(5, max(1, priority))
    
    async def calculate_optimal_schedule(self, user_id: str, topic_clusters: List[Dict], 
                                       exam_date: str, availability: List[str],
                                       user_profile: Dict, learning_analytics: Dict,
                                       learning_patterns: Dict) -> List[Dict]:
        """Calculate optimal study schedule using ML"""
        try:
            exam_datetime = datetime.fromisoformat(exam_date)
            days_until_exam = (exam_datetime - datetime.now()).days
            
            if days_until_exam <= 0:
                return []
            
            # Get user's optimal study times
            optimal_times = learning_patterns.get('optimal_study_times', {})
            best_hour = optimal_times.get('best_hour', 14)
            session_length = optimal_times.get('session_length', 30)
            
            # Get attention span
            attention_span = user_profile.get('attention_span', 30)
            max_session_length = min(session_length, attention_span)
            
            # Calculate total study hours needed
            total_hours_needed = sum(cluster['total_hours'] for cluster in topic_clusters)
            
            # Calculate daily study hours
            study_days = len(availability) * (days_until_exam // 7)  # Approximate
            daily_hours = total_hours_needed / max(study_days, 1)
            
            # Create schedule
            schedule = []
            current_date = datetime.now()
            
            for cluster in topic_clusters:
                cluster_sessions = self.plan_cluster_sessions(
                    cluster, daily_hours, max_session_length, best_hour
                )
                
                for session in cluster_sessions:
                    if current_date < exam_datetime:
                        schedule.append({
                            'date': current_date.strftime('%Y-%m-%d'),
                            'time': f"{best_hour:02d}:00",
                            'duration': session['duration'],
                            'topics': session['topics'],
                            'difficulty': cluster['difficulty_level'],
                            'priority': cluster['priority'],
                            'session_type': session['type'],
                            'ml_confidence': self.calculate_session_confidence(session, learning_analytics)
                        })
                        
                        # Move to next day
                        current_date += timedelta(days=1)
            
            return schedule
            
        except Exception as e:
            print(f"X Error calculating optimal schedule: {e}")
            return []
    
    def plan_cluster_sessions(self, cluster: Dict, daily_hours: float, 
                            max_session_length: int, best_hour: int) -> List[Dict]:
        """Plan study sessions for a cluster"""
        sessions = []
        topics = cluster['topics']
        total_hours = cluster['total_hours']
        
        # Split into sessions based on attention span
        remaining_hours = total_hours
        session_id = 0
        
        while remaining_hours > 0:
            session_hours = min(remaining_hours, max_session_length / 60)
            session_topics = topics[session_id:session_id + 2]  # 1-2 topics per session
            
            sessions.append({
                'duration': int(session_hours * 60),
                'topics': [t['name'] for t in session_topics],
                'type': 'learning' if session_id == 0 else 'review',
                'difficulty': cluster['difficulty_level']
            })
            
            remaining_hours -= session_hours
            session_id += 1
        
        return sessions
    
    def calculate_session_confidence(self, session: Dict, learning_analytics: Dict) -> float:
        """Calculate confidence in session planning"""
        base_confidence = 0.7
        
        # Adjust based on session duration
        duration = session['duration']
        if 20 <= duration <= 45:
            base_confidence += 0.1
        elif duration > 60:
            base_confidence -= 0.1
        
        # Adjust based on difficulty
        difficulty = session['difficulty']
        if difficulty == 'medium':
            base_confidence += 0.05
        elif difficulty == 'hard':
            base_confidence -= 0.05
        
        return min(0.95, max(0.5, base_confidence))
    
    async def generate_plan_insights(self, schedule: List[Dict], user_profile: Dict, 
                                   learning_analytics: Dict) -> List[str]:
        """Generate ML-powered insights for the study plan"""
        insights = []
        
        if not schedule:
            return ["No schedule generated - please check your exam date and availability"]
        
        # Analyze schedule distribution
        total_hours = sum(s['duration'] for s in schedule) / 60
        insights.append(f"Total study time planned: {total_hours:.1f} hours")
        
        # Analyze difficulty distribution
        difficulties = [s['difficulty'] for s in schedule]
        difficulty_counts = {'easy': 0, 'medium': 0, 'hard': 0}
        for diff in difficulties:
            difficulty_counts[diff] += 1
        
        if difficulty_counts['hard'] > difficulty_counts['easy']:
            insights.append("Plan focuses on challenging topics - consider adding more foundational review")
        elif difficulty_counts['easy'] > difficulty_counts['hard']:
            insights.append("Plan emphasizes fundamentals - good for building strong foundation")
        
        # Analyze session lengths
        durations = [s['duration'] for s in schedule]
        avg_duration = np.mean(durations)
        if avg_duration > 45:
            insights.append("Sessions are longer than your typical attention span - consider breaking them down")
        elif avg_duration < 20:
            insights.append("Short sessions planned - you might want to combine some for efficiency")
        
        # Learning style recommendations
        learning_style = user_profile.get('learning_style', 'reading')
        if learning_style == 'visual':
            insights.append("Consider creating diagrams and mind maps for visual learning")
        elif learning_style == 'kinesthetic':
            insights.append("Try hands-on practice and interactive exercises")
        
        return insights
    
    def calculate_plan_confidence(self, learning_analytics: Dict) -> float:
        """Calculate confidence in the overall plan"""
        if not learning_analytics:
            return 0.6
        
        # Base confidence
        confidence = 0.7
        
        # Adjust based on data availability
        if 'learning_velocity' in learning_analytics:
            confidence += 0.1
        
        if 'optimal_study_times' in learning_analytics:
            confidence += 0.1
        
        if 'attention_span_analysis' in learning_analytics:
            confidence += 0.1
        
        return min(0.95, confidence)
    
    def generate_adaptation_strategy(self, learning_patterns: Dict) -> Dict:
        """Generate strategy for adapting the plan based on user behavior"""
        strategy = {
            'adaptation_frequency': 'weekly',
            'key_metrics': ['performance', 'session_completion', 'attention_span'],
            'adjustment_triggers': []
        }
        
        # Add triggers based on patterns
        if learning_patterns.get('burnout_indicators', {}).get('risk_level') == 'high':
            strategy['adjustment_triggers'].append('reduce_session_length')
            strategy['adjustment_triggers'].append('increase_breaks')
        
        if learning_patterns.get('learning_velocity', 0) > 0.8:
            strategy['adjustment_triggers'].append('increase_difficulty')
        
        if learning_patterns.get('attention_span_patterns', {}).get('consistency', 0) < 0.5:
            strategy['adjustment_triggers'].append('flexible_scheduling')
        
        return strategy
    
    async def fallback_basic_plan(self, subjects: List[str], exam_date: str, 
                                availability: List[str]) -> Dict:
        """Fallback to basic plan if ML fails"""
        exam_datetime = datetime.fromisoformat(exam_date)
        days_until_exam = (exam_datetime - datetime.now()).days
        
        basic_plan = []
        for i, subject in enumerate(subjects):
            basic_plan.append({
                'date': (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d'),
                'time': '14:00',
                'duration': 60,
                'topics': [f'{subject} Study Session'],
                'difficulty': 'medium',
                'priority': 3,
                'session_type': 'learning',
                'ml_confidence': 0.5
            })
        
        return {
            'plan': basic_plan,
            'insights': ['Basic plan generated - limited personalization available'],
            'personalization_factors': {},
            'ml_confidence': 0.5,
            'adaptation_strategy': {'adaptation_frequency': 'manual'}
        }
    
    # Helper methods for data retrieval
    async def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Get user's learning profile"""
        try:
            response = await self.supabase.table('learning_profiles')\
                .select('*')\
                .eq('user_id', user_id)\
                .single()
            return response.data
        except Exception as e:
            print(f"X Error getting user profile: {e}")
            return None
    
    async def get_learning_analytics(self, user_id: str) -> Optional[Dict]:
        """Get recent learning analytics"""
        try:
            response = await self.supabase.table('learning_analytics')\
                .select('analytics_data')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(1)\
                .single()
            return response.data.get('analytics_data') if response.data else None
        except Exception as e:
            print(f"X Error getting learning analytics: {e}")
            return None
    
    async def get_user_topics(self, user_id: str) -> List[Dict]:
        """Get user's topics"""
        try:
            response = await self.supabase.table('user_topics')\
                .select('*')\
                .eq('user_id', user_id)\
                .execute()
            return response.data
        except Exception as e:
            print(f"X Error getting user topics: {e}")
            return []
    
    async def get_quiz_results(self, user_id: str) -> List[Dict]:
        """Get user's quiz results"""
        try:
            response = await self.supabase.table('quiz_results')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('quiz_timestamp', desc=True)\
                .execute()
            return response.data
        except Exception as e:
            print(f"X Error getting quiz results: {e}")
            return []
    
    async def get_study_sessions(self, user_id: str) -> List[Dict]:
        """Get user's study sessions"""
        try:
            response = await self.supabase.table('study_sessions')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('session_start', desc=True)\
                .execute()
            return response.data
        except Exception as e:
            print(f"X Error getting study sessions: {e}")
            return []
    
    async def get_spaced_repetition_data(self, user_id: str) -> List[Dict]:
        """Get user's spaced repetition data"""
        try:
            response = await self.supabase.table('spaced_repetition_data')\
                .select('*')\
                .eq('user_id', user_id)\
                .execute()
            return response.data
        except Exception as e:
            print(f"X Error getting spaced repetition data: {e}")
            return []
