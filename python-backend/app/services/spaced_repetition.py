"""
Spaced Repetition Engine - Python Implementation
Based on Ebbinghaus Forgetting Curve and SuperMemo 2 algorithm
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
from app.core.supabase_client import supabase_client

# Define QuizResult type for type hints
class QuizResult:
    def __init__(self, score: float, topic_name: str, timestamp: str):
        self.score = score
        self.topic_name = topic_name
        self.timestamp = timestamp

class SpacedRepetitionEngine:
    """Advanced spaced repetition engine with ML enhancements"""
    
    def __init__(self):
        """Initialize the spaced repetition engine"""
        # SuperMemo 2 algorithm parameters
        self.min_ease_factor = 1.3
        self.max_ease_factor = 2.5
        self.initial_ease_factor = 2.5
        self.min_interval = 1
        self.max_interval = 365
        
        # ML model parameters (placeholder for future ML integration)
        self.forgetting_curve_params = {
            'decay_rate': 0.5,
            'stability_factor': 1.0
        }
        
        # Initialize Supabase client
        self.supabase = supabase_client.get_client()
        
        # Constants for spaced repetition intervals (in days)
        self.INTERVALS = {
            'EASY': [1, 6, 15, 30, 90, 180, 365],
            'MEDIUM': [1, 3, 7, 14, 30, 60, 120],
            'HARD': [1, 2, 4, 8, 16, 32, 64],
            'DEFAULT': [1, 3, 7, 14, 30, 60, 120]
        }
        
        # Performance thresholds for adjusting intervals
        self.PERFORMANCE_THRESHOLDS = {
            'EXCELLENT': 0.9,  # 90%+ correct
            'GOOD': 0.8,       # 80-89% correct
            'FAIR': 0.6,       # 60-79% correct
            'POOR': 0.4        # Below 60% correct
        }
    
    def calculate_next_review(
        self, 
        user_id: str, 
        topic_name: str, 
        performance_score: float, 
        difficulty: str
    ) -> Dict[str, Any]:
        """Calculate next review date using spaced repetition algorithm"""
        
        # Get existing spaced repetition data
        sr_data_list = db_service.get_spaced_repetition_data(user_id, topic_name)
        sr_data = sr_data_list[0] if sr_data_list else None
        
        # Get user's learning profile
        profile = db_service.get_learning_profile(user_id)
        
        # Normalize performance score (0-1)
        normalized_score = performance_score / 100
        
        # Initialize or update spaced repetition data
        if not sr_data:
            sr_data = {
                'interval_days': 1,
                'repetitions': 0,
                'ease_factor': 2.5,
                'last_review': datetime.now().isoformat(),
                'next_review': (datetime.now() + timedelta(days=1)).isoformat(),
                'performance_history': [],
                'forgetting_probability': 1.0
            }
        else:
            # Convert to dict if it's a database object
            if hasattr(sr_data, '__dict__'):
                sr_data = sr_data.__dict__
        
        # Update performance metrics
        sr_data['repetitions'] = sr_data.get('repetitions', 0) + 1
        sr_data['last_review'] = datetime.now().isoformat()
        
        # Add to performance history
        if not sr_data.get('performance_history'):
            sr_data['performance_history'] = []
        sr_data['performance_history'].append(performance_score)
        
        # Calculate average performance
        avg_performance = np.mean(sr_data['performance_history'])
        
        # Determine interval adjustment based on performance
        interval_adjustment = self._calculate_interval_adjustment(normalized_score, avg_performance)
        
        # Get intervals for difficulty level
        intervals = self.INTERVALS.get(difficulty.upper(), self.INTERVALS['DEFAULT'])
        
        # Calculate next interval
        current_interval = intervals[min(sr_data.get('interval_days', 1), len(intervals) - 1)]
        adjusted_interval = max(1, int(current_interval * interval_adjustment))
        
        # Move to next interval level if performance was good
        if normalized_score >= self.PERFORMANCE_THRESHOLDS['GOOD'] and sr_data.get('interval_days', 1) < len(intervals) - 1:
            sr_data['interval_days'] = sr_data.get('interval_days', 1) + 1
        
        # Calculate next review date
        sr_data['next_review'] = (datetime.now() + timedelta(days=adjusted_interval)).isoformat()
        sr_data['forgetting_probability'] = self._calculate_forgetting_probability(
            datetime.fromisoformat(sr_data['last_review']), adjusted_interval
        )
        
        # Update ease factor (SuperMemo 2 algorithm)
        sr_data['ease_factor'] = self._update_ease_factor(
            sr_data.get('ease_factor', 2.5), normalized_score
        )
        
        # Save updated data to database using Supabase
        try:
            self.supabase.table('spaced_repetition_data').upsert({
                'user_id': user_id,
                'topic_name': topic_name,
                **sr_data
            }).execute()
        except Exception as e:
            print(f"Error updating spaced repetition data: {e}")
        
        return {
            'next_review': sr_data['next_review'],
            'interval_days': adjusted_interval,
            'repetitions': sr_data['repetitions'],
            'ease_factor': sr_data['ease_factor'],
            'forgetting_probability': sr_data['forgetting_probability']
        }
    
    def get_topics_due_for_review(self, user_id: str) -> List[Dict[str, Any]]:
        """Get topics that are due for review"""
        now = datetime.now()
        
        # Get all spaced repetition data for user from Supabase
        try:
            result = self.supabase.table('spaced_repetition_data').select('*').eq('user_id', user_id).execute()
            all_sr_data = result.data if result.data else []
        except Exception as e:
            print(f"Error fetching spaced repetition data: {e}")
            all_sr_data = []
        
        # If no data exists, create some sample data from user's topics
        if not all_sr_data:
            return self._create_sample_review_data(user_id)
        
        # Filter topics due for review
        sr_data = [
            data for data in all_sr_data 
            if data.get('next_review') and datetime.fromisoformat(data['next_review']) <= now
        ]
        
        topics = []
        for data in sr_data:
            # Calculate urgency based on forgetting probability and time overdue
            next_review_date = datetime.fromisoformat(data['next_review'])
            time_overdue = (now - next_review_date).days
            urgency_score = data.get('forgetting_probability', 0) + (time_overdue * 0.1)
            
            if urgency_score > 0.8:
                urgency = 'critical'
            elif urgency_score > 0.6:
                urgency = 'high'
            elif urgency_score > 0.4:
                urgency = 'medium'
            else:
                urgency = 'low'
            
            topics.append({
                'topic_name': data['topic_name'],
                'retention_probability': 1 - data.get('forgetting_probability', 0),
                'streak': data.get('repetitions', 0),
                'last_review': data.get('last_review'),
                'next_review': data.get('next_review'),
                'urgency': urgency,
                'time_overdue_days': max(0, time_overdue),
                'ease_factor': data.get('ease_factor', 2.5),
                'difficulty': data.get('difficulty', 'medium'),
                'last_performance': data.get('performance_history', [0.7])[-1] if data.get('performance_history') else 0.7
            })
        
        # Sort by urgency (most urgent first)
        topics.sort(key=lambda x: (
            {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}[x['urgency']],
            -x['retention_probability']
        ))
        
        return topics
    
    def _create_sample_review_data(self, user_id: str) -> List[Dict[str, Any]]:
        """Create sample review data if none exists"""
        # Get user's actual topics from user_topics table in Supabase
        try:
            result = self.supabase.table('user_topics').select('topic_name').eq('user_id', user_id).execute()
            user_topics = [topic['topic_name'] for topic in result.data] if result.data else []
        except Exception as e:
            print(f"Error fetching user topics: {e}")
            user_topics = []
        
        # Fallback to sample topics if no user topics found
        sample_topics = user_topics if user_topics else ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'History']
        
        topics = []
        for i, topic in enumerate(sample_topics):
            # Create varied review schedules
            days_overdue = i - 2  # Some overdue, some future
            next_review = datetime.now() + timedelta(days=days_overdue)
            
            retention_prob = 0.9 - (i * 0.15)  # Decreasing retention
            urgency = 'critical' if days_overdue > 1 else 'high' if days_overdue > 0 else 'medium'
            
            topics.append({
                'topic_name': topic,
                'retention_probability': max(0.3, retention_prob),
                'streak': max(1, 5 - i),
                'last_review': (datetime.now() - timedelta(days=abs(days_overdue) + 1)).isoformat(),
                'next_review': next_review.isoformat(),
                'urgency': urgency,
                'time_overdue_days': max(0, -days_overdue),
                'ease_factor': 2.5,
                'difficulty': ['easy', 'medium', 'hard'][i % 3],
                'last_performance': max(0.4, 0.9 - (i * 0.1))
            })
        
        return topics[:3]  # Return top 3 for demo
    
    def calculate_forgetting_probability(self, last_review: datetime, interval_days: int) -> float:
        """Calculate forgetting probability based on Ebbinghaus forgetting curve"""
        days_since_review = (datetime.now() - last_review).days
        time_ratio = days_since_review / interval_days if interval_days > 0 else 1
        
        # Ebbinghaus forgetting curve: R = e^(-t/S)
        # Where R is retention, t is time, S is strength
        strength = interval_days * 0.5  # Adjust strength based on interval
        retention = np.exp(-time_ratio / strength) if strength > 0 else 0
        
        return max(0, 1 - retention)
    
    def generate_study_recommendations(
        self, 
        user_id: str
    ) -> Dict[str, Any]:
        """Generate personalized study recommendations"""
        
        # Get topics due for review
        urgent_topics = self.get_topics_due_for_review(user_id)
        
        # Get user's learning profile
        profile = db_service.get_learning_profile(user_id)
        
        # Get recent quiz performance (we'll need to implement this in db_service)
        # For now, we'll use a placeholder
        recent_quizzes = []
        
        # Calculate performance analysis
        performance_analysis = self._analyze_performance_patterns(recent_quizzes)
        
        # Generate recommendations
        recommendations = []
        
        # High priority topics
        high_priority_topics = [t for t in urgent_topics if t['urgency'] in ['CRITICAL', 'HIGH']]
        if high_priority_topics:
            recommendations.append({
                'type': 'URGENT_REVIEW',
                'title': f'Focus on {len(high_priority_topics)} High-Priority Topics',
                'description': f'You have {len(high_priority_topics)} topics that need immediate attention',
                'priority': 'HIGH',
                'topics': [t['topic_name'] for t in high_priority_topics[:3]]
            })
        
        # Performance-based recommendations
        if performance_analysis['average_score'] < 60:
            recommendations.append({
                'type': 'FUNDAMENTALS',
                'title': 'Strengthen Fundamentals',
                'description': 'Focus on basic concepts before attempting advanced topics',
                'priority': 'HIGH'
            })
        
        if performance_analysis['improvement_trend'] > 0.1:
            recommendations.append({
                'type': 'IMPROVEMENT',
                'title': 'Great Progress!',
                'description': 'You\'re showing consistent improvement. Keep up the good work!',
                'priority': 'LOW'
            })
        
        # Calculate optimal session
        session_plan = self._calculate_optimal_session(urgent_topics, profile)
        
        return {
            'urgent_topics': urgent_topics[:5],  # Top 5 most urgent
            'total_due': len(urgent_topics),
            'recommendations': recommendations,
            'session_plan': session_plan,
            'performance_analysis': performance_analysis
        }
    
    def _calculate_interval_adjustment(self, current_score: float, avg_score: float) -> float:
        """Calculate interval adjustment based on performance"""
        if current_score >= self.PERFORMANCE_THRESHOLDS['EXCELLENT']:
            return 1.5  # Increase interval significantly
        elif current_score >= self.PERFORMANCE_THRESHOLDS['GOOD']:
            return 1.2  # Increase interval moderately
        elif current_score >= self.PERFORMANCE_THRESHOLDS['FAIR']:
            return 1.0  # Keep current interval
        elif current_score >= self.PERFORMANCE_THRESHOLDS['POOR']:
            return 0.7  # Decrease interval
        else:
            return 0.5  # Reset to beginning
    
    def _calculate_forgetting_probability(self, last_review: datetime, interval_days: int) -> float:
        """Calculate forgetting probability using Ebbinghaus curve"""
        days_since_review = (datetime.now() - last_review).days
        time_ratio = days_since_review / interval_days if interval_days > 0 else 1
        
        strength = interval_days * 0.5
        retention = np.exp(-time_ratio / strength) if strength > 0 else 0
        
        return max(0, 1 - retention)
    
    def _update_ease_factor(self, current_ease: float, performance: float) -> float:
        """Update ease factor using SuperMemo 2 algorithm"""
        if performance >= 0.9:
            return current_ease + 0.1
        elif performance >= 0.8:
            return current_ease
        elif performance >= 0.6:
            return current_ease - 0.1
        else:
            return max(1.3, current_ease - 0.2)
    
    def _analyze_performance_patterns(self, recent_quizzes: List[QuizResult]) -> Dict[str, Any]:
        """Analyze recent performance patterns"""
        if not recent_quizzes:
            return {
                'average_score': 0,
                'improvement_trend': 0,
                'consistency': 0,
                'total_quizzes': 0
            }
        
        scores = [q.score for q in recent_quizzes]
        average_score = np.mean(scores)
        
        # Calculate improvement trend
        if len(scores) >= 4:
            mid = len(scores) // 2
            first_half = scores[:mid]
            second_half = scores[mid:]
            improvement_trend = (np.mean(second_half) - np.mean(first_half)) / np.mean(first_half)
        else:
            improvement_trend = 0
        
        # Calculate consistency (inverse of standard deviation)
        consistency = 1 - (np.std(scores) / 100) if len(scores) > 1 else 1
        
        return {
            'average_score': average_score,
            'improvement_trend': improvement_trend,
            'consistency': consistency,
            'total_quizzes': len(scores)
        }
    
    def _calculate_optimal_session(
        self, 
        urgent_topics: List[Dict[str, Any]], 
        profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate optimal study session parameters"""
        
        # Base duration from profile or default
        base_duration = profile.get('attention_span', 60) if profile else 60
        
        # Adjust based on number of urgent topics
        if len(urgent_topics) > 5:
            duration = min(base_duration * 1.5, 120)  # Cap at 2 hours
        elif len(urgent_topics) > 2:
            duration = base_duration
        else:
            duration = max(base_duration * 0.7, 20)  # Minimum 20 minutes
        
        # Calculate breaks
        breaks = max(1, int(duration / 45))  # Break every 45 minutes
        
        # Select topics based on urgency
        high_priority = [t for t in urgent_topics if t['urgency'] in ['CRITICAL', 'HIGH']]
        medium_priority = [t for t in urgent_topics if t['urgency'] == 'MEDIUM']
        
        selected_topics = high_priority[:3] + medium_priority[:2]
        
        return {
            'duration': int(duration),
            'topic_count': len(selected_topics),
            'topics': selected_topics,
            'breaks': breaks,
            'estimated_time': int(duration + (breaks * 5))  # 5 minutes per break
        }



