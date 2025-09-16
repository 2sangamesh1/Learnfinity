"""
Study Plan Generator - Intelligent scheduling algorithm for personalized learning
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import json
from app.core.supabase_client import supabase_client

class Priority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

class StudySessionType(Enum):
    NEW_CONTENT = "new_content"
    REVIEW = "review"
    PRACTICE = "practice"
    ASSESSMENT = "assessment"

@dataclass
class StudyBlock:
    topic: str
    session_type: StudySessionType
    duration_minutes: int
    priority: Priority
    scheduled_time: datetime
    difficulty: str
    estimated_effort: float
    prerequisites: List[str]
    learning_objectives: List[str]

@dataclass
class UserPreferences:
    daily_study_time: int  # minutes
    preferred_session_length: int  # minutes
    break_duration: int  # minutes
    peak_hours: List[int]  # hours of day (0-23)
    difficulty_preference: str
    learning_style: str
    max_sessions_per_day: int

class StudyPlanGenerator:
    """Advanced study plan generator with personalized scheduling"""
    
    def __init__(self):
        self.supabase = supabase_client.get_client()
        
        # Learning efficiency curves based on research
        self.efficiency_curves = {
            'visual': {'morning': 0.9, 'afternoon': 0.8, 'evening': 0.7},
            'auditory': {'morning': 0.8, 'afternoon': 0.9, 'evening': 0.8},
            'kinesthetic': {'morning': 0.7, 'afternoon': 0.9, 'evening': 0.6},
            'reading': {'morning': 0.9, 'afternoon': 0.7, 'evening': 0.8}
        }
        
        # Cognitive load factors
        self.cognitive_load = {
            'easy': 0.3,
            'medium': 0.6,
            'hard': 0.9
        }
        
    async def generate_personalized_study_plan(
        self, 
        user_id: str, 
        topics: List[str], 
        target_date: datetime,
        preferences: Optional[UserPreferences] = None
    ) -> Dict[str, Any]:
        """Generate a comprehensive study plan tailored to user preferences and learning patterns"""
        
        # Get user data and preferences
        if not preferences:
            preferences = await self._get_user_preferences(user_id)
        
        # Analyze user's learning patterns
        learning_analytics = await self._analyze_learning_patterns(user_id)
        
        # Get spaced repetition data for existing topics
        spaced_rep_data = await self._get_spaced_repetition_schedule(user_id)
        
        # Calculate available study time
        available_days = (target_date - datetime.now()).days
        total_study_time = available_days * preferences.daily_study_time
        
        # Prioritize topics based on multiple factors
        prioritized_topics = await self._prioritize_topics(
            user_id, topics, learning_analytics, spaced_rep_data
        )
        
        # Generate study blocks
        study_blocks = await self._generate_study_blocks(
            prioritized_topics, preferences, available_days, learning_analytics
        )
        
        # Optimize schedule using intelligent algorithms
        optimized_schedule = await self._optimize_schedule(
            study_blocks, preferences, learning_analytics
        )
        
        # Generate final study plan
        study_plan = {
            'user_id': user_id,
            'generated_at': datetime.now().isoformat(),
            'target_date': target_date.isoformat(),
            'total_study_time_minutes': total_study_time,
            'daily_sessions': optimized_schedule,
            'learning_objectives': await self._extract_learning_objectives(topics),
            'progress_milestones': await self._generate_milestones(topics, available_days),
            'adaptive_adjustments': await self._generate_adaptive_rules(user_id, learning_analytics),
            'estimated_completion': await self._estimate_completion_probability(
                topics, preferences, learning_analytics
            )
        }
        
        # Save study plan to database
        await self._save_study_plan(user_id, study_plan)
        
        return study_plan
    
    async def _get_user_preferences(self, user_id: str) -> UserPreferences:
        """Get user preferences from database or use defaults"""
        try:
            result = self.supabase.table('learning_profiles').select('*').eq('user_id', user_id).single().execute()
            profile = result.data if result.data else None
        except Exception as e:
            print(f"Error fetching learning profile: {e}")
            profile = None
        
        if profile:
            return UserPreferences(
                daily_study_time=profile.get('daily_study_time', 120),
                preferred_session_length=profile.get('preferred_session_length', 25),
                break_duration=profile.get('break_duration', 5),
                peak_hours=profile.get('peak_hours', [9, 10, 11, 14, 15, 16]),
                difficulty_preference=profile.get('difficulty_preference', 'medium'),
                learning_style=profile.get('learning_style', 'visual'),
                max_sessions_per_day=profile.get('max_sessions_per_day', 6)
            )
        
        # Default preferences
        return UserPreferences(
            daily_study_time=120,
            preferred_session_length=25,
            break_duration=5,
            peak_hours=[9, 10, 11, 14, 15, 16],
            difficulty_preference='medium',
            learning_style='visual',
            max_sessions_per_day=6
        )
    
    async def _analyze_learning_patterns(self, user_id: str) -> Dict[str, Any]:
        """Analyze user's historical learning patterns"""
        
        # Get user's quiz results and study sessions
        try:
            quiz_result = self.supabase.table('quiz_results').select('*').eq('user_id', user_id).execute()
            quiz_results = quiz_result.data if quiz_result.data else []
            
            session_result = self.supabase.table('study_sessions').select('*').eq('user_id', user_id).execute()
            study_sessions = session_result.data if session_result.data else []
        except Exception as e:
            print(f"Error fetching user data: {e}")
            quiz_results = []
            study_sessions = []
        
        if not quiz_results:
            return self._default_learning_analytics()
        
        # Calculate learning velocity
        learning_velocity = self._calculate_learning_velocity(quiz_results)
        
        # Analyze performance by time of day
        time_performance = self._analyze_time_performance(quiz_results)
        
        # Calculate retention patterns
        retention_patterns = self._analyze_retention_patterns(quiz_results)
        
        # Identify optimal session length
        optimal_session_length = self._find_optimal_session_length(study_sessions)
        
        # Calculate difficulty adaptation rate
        difficulty_adaptation = self._analyze_difficulty_progression(quiz_results)
        
        return {
            'learning_velocity': learning_velocity,
            'time_performance': time_performance,
            'retention_patterns': retention_patterns,
            'optimal_session_length': optimal_session_length,
            'difficulty_adaptation': difficulty_adaptation,
            'confidence_score': self._calculate_confidence_score(quiz_results)
        }
    
    def _default_learning_analytics(self) -> Dict[str, Any]:
        """Default analytics for new users"""
        return {
            'learning_velocity': 0.7,
            'time_performance': {'morning': 0.8, 'afternoon': 0.7, 'evening': 0.6},
            'retention_patterns': {'1_day': 0.8, '3_days': 0.6, '7_days': 0.4, '30_days': 0.3},
            'optimal_session_length': 25,
            'difficulty_adaptation': 0.5,
            'confidence_score': 0.5
        }
    
    async def _prioritize_topics(
        self, 
        user_id: str, 
        topics: List[str], 
        analytics: Dict[str, Any],
        spaced_rep_data: Dict[str, Any]
    ) -> List[Tuple[str, float]]:
        """Prioritize topics based on multiple factors"""
        
        topic_priorities = []
        
        for topic in topics:
            priority_score = 0.0
            
            # Factor 1: Spaced repetition urgency
            if topic in spaced_rep_data:
                days_overdue = spaced_rep_data[topic].get('days_overdue', 0)
                priority_score += min(days_overdue * 0.2, 1.0)
            
            # Factor 2: User's historical performance in this topic
            topic_performance = await self._get_topic_performance(user_id, topic)
            if topic_performance < 0.7:  # Struggling topics get higher priority
                priority_score += (0.7 - topic_performance) * 0.5
            
            # Factor 3: Topic difficulty vs user's current level
            topic_difficulty = await self._estimate_topic_difficulty(topic)
            user_level = analytics['confidence_score']
            difficulty_gap = abs(topic_difficulty - user_level)
            if difficulty_gap < 0.2:  # Topics at appropriate difficulty level
                priority_score += 0.3
            
            # Factor 4: Prerequisites completion
            prerequisites_met = await self._check_prerequisites(user_id, topic)
            if prerequisites_met:
                priority_score += 0.2
            
            topic_priorities.append((topic, priority_score))
        
        # Sort by priority score (descending)
        return sorted(topic_priorities, key=lambda x: x[1], reverse=True)
    
    async def _generate_study_blocks(
        self, 
        prioritized_topics: List[Tuple[str, float]], 
        preferences: UserPreferences,
        available_days: int,
        analytics: Dict[str, Any]
    ) -> List[StudyBlock]:
        """Generate optimized study blocks"""
        
        study_blocks = []
        current_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        for day in range(available_days):
            day_date = current_date + timedelta(days=day)
            daily_blocks = []
            
            # Distribute topics across the day based on cognitive load
            remaining_time = preferences.daily_study_time
            session_count = 0
            
            for topic, priority in prioritized_topics:
                if remaining_time <= 0 or session_count >= preferences.max_sessions_per_day:
                    break
                
                # Determine session type based on topic status
                session_type = await self._determine_session_type(topic, day)
                
                # Calculate optimal session duration
                session_duration = min(
                    preferences.preferred_session_length,
                    remaining_time,
                    self._calculate_optimal_duration(topic, analytics)
                )
                
                if session_duration < 10:  # Minimum viable session
                    continue
                
                # Create study block
                block = StudyBlock(
                    topic=topic,
                    session_type=session_type,
                    duration_minutes=session_duration,
                    priority=self._convert_to_priority_enum(priority),
                    scheduled_time=day_date,  # Will be optimized later
                    difficulty=await self._get_topic_difficulty(topic),
                    estimated_effort=self._calculate_effort_score(topic, session_duration),
                    prerequisites=await self._get_topic_prerequisites(topic),
                    learning_objectives=await self._get_topic_objectives(topic)
                )
                
                daily_blocks.append(block)
                remaining_time -= session_duration + preferences.break_duration
                session_count += 1
            
            study_blocks.extend(daily_blocks)
        
        return study_blocks
    
    async def _optimize_schedule(
        self, 
        study_blocks: List[StudyBlock], 
        preferences: UserPreferences,
        analytics: Dict[str, Any]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Optimize the schedule using intelligent algorithms"""
        
        optimized_schedule = {}
        
        # Group blocks by day
        blocks_by_day = {}
        for block in study_blocks:
            day_key = block.scheduled_time.strftime('%Y-%m-%d')
            if day_key not in blocks_by_day:
                blocks_by_day[day_key] = []
            blocks_by_day[day_key].append(block)
        
        # Optimize each day's schedule
        for day_key, day_blocks in blocks_by_day.items():
            optimized_day = self._optimize_daily_schedule(
                day_blocks, preferences, analytics
            )
            optimized_schedule[day_key] = optimized_day
        
        return optimized_schedule
    
    def _optimize_daily_schedule(
        self, 
        blocks: List[StudyBlock], 
        preferences: UserPreferences,
        analytics: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Optimize a single day's schedule"""
        
        # Sort blocks by priority and cognitive load
        sorted_blocks = sorted(blocks, key=lambda b: (
            -b.priority.value,  # Higher priority first
            self.cognitive_load.get(b.difficulty, 0.5)  # Easier tasks when tired
        ))
        
        scheduled_sessions = []
        current_time = datetime.now().replace(hour=preferences.peak_hours[0], minute=0, second=0)
        
        for block in sorted_blocks:
            # Find optimal time slot based on learning style and performance patterns
            optimal_time = self._find_optimal_time_slot(
                current_time, block, preferences, analytics
            )
            
            session = {
                'topic': block.topic,
                'session_type': block.session_type.value,
                'start_time': optimal_time.strftime('%H:%M'),
                'duration_minutes': block.duration_minutes,
                'difficulty': block.difficulty,
                'priority': block.priority.name,
                'learning_objectives': block.learning_objectives,
                'estimated_effort': block.estimated_effort,
                'break_after': preferences.break_duration
            }
            
            scheduled_sessions.append(session)
            current_time = optimal_time + timedelta(
                minutes=block.duration_minutes + preferences.break_duration
            )
        
        return scheduled_sessions
    
    def _find_optimal_time_slot(
        self, 
        start_time: datetime, 
        block: StudyBlock, 
        preferences: UserPreferences,
        analytics: Dict[str, Any]
    ) -> datetime:
        """Find the optimal time slot for a study block"""
        
        # Consider user's peak hours
        hour = start_time.hour
        if hour in preferences.peak_hours:
            efficiency_multiplier = 1.0
        else:
            efficiency_multiplier = 0.7
        
        # Consider learning style efficiency
        time_of_day = self._get_time_of_day(hour)
        learning_style = preferences.learning_style
        style_efficiency = self.efficiency_curves.get(learning_style, {}).get(time_of_day, 0.7)
        
        # Adjust for cognitive load
        cognitive_load = self.cognitive_load.get(block.difficulty, 0.5)
        
        # High cognitive load tasks should be scheduled during peak efficiency
        if cognitive_load > 0.7 and style_efficiency < 0.8:
            # Try to find a better time slot within peak hours
            for peak_hour in preferences.peak_hours:
                peak_time = start_time.replace(hour=peak_hour)
                peak_time_of_day = self._get_time_of_day(peak_hour)
                peak_efficiency = self.efficiency_curves.get(learning_style, {}).get(peak_time_of_day, 0.7)
                
                if peak_efficiency > style_efficiency:
                    return peak_time
        
        return start_time
    
    def _get_time_of_day(self, hour: int) -> str:
        """Convert hour to time of day category"""
        if 6 <= hour < 12:
            return 'morning'
        elif 12 <= hour < 17:
            return 'afternoon'
        else:
            return 'evening'
    
    # Helper methods for calculations
    def _calculate_learning_velocity(self, quiz_results: List[Dict]) -> float:
        """Calculate how quickly the user learns new material"""
        if not quiz_results:
            return 0.7
        
        # Analyze improvement over time
        scores = [result.get('score', 0) for result in quiz_results[-10:]]
        if len(scores) < 2:
            return 0.7
        
        # Calculate trend
        x = np.arange(len(scores))
        coeffs = np.polyfit(x, scores, 1)
        velocity = max(0.1, min(1.0, coeffs[0] / 10 + 0.5))
        
        return velocity
    
    def _analyze_time_performance(self, quiz_results: List[Dict]) -> Dict[str, float]:
        """Analyze performance by time of day"""
        time_performance = {'morning': [], 'afternoon': [], 'evening': []}
        
        for result in quiz_results:
            if 'quiz_timestamp' in result:
                hour = datetime.fromisoformat(result['quiz_timestamp']).hour
                time_of_day = self._get_time_of_day(hour)
                time_performance[time_of_day].append(result.get('score', 0))
        
        # Calculate averages
        return {
            time: np.mean(scores) / 100 if scores else 0.7
            for time, scores in time_performance.items()
        }
    
    def _analyze_retention_patterns(self, quiz_results: List[Dict]) -> Dict[str, float]:
        """Analyze how well the user retains information over time"""
        # Simplified retention analysis
        return {
            '1_day': 0.85,
            '3_days': 0.70,
            '7_days': 0.55,
            '30_days': 0.40
        }
    
    def _find_optimal_session_length(self, study_sessions: List[Dict]) -> int:
        """Find the user's optimal study session length"""
        if not study_sessions:
            return 25
        
        # Analyze session effectiveness by duration
        session_effectiveness = {}
        for session in study_sessions:
            duration = session.get('duration_minutes', 25)
            effectiveness = session.get('effectiveness_score', 0.7)
            
            duration_bucket = (duration // 10) * 10  # Round to nearest 10
            if duration_bucket not in session_effectiveness:
                session_effectiveness[duration_bucket] = []
            session_effectiveness[duration_bucket].append(effectiveness)
        
        # Find duration with highest average effectiveness
        best_duration = 25
        best_effectiveness = 0
        
        for duration, scores in session_effectiveness.items():
            avg_effectiveness = np.mean(scores)
            if avg_effectiveness > best_effectiveness:
                best_effectiveness = avg_effectiveness
                best_duration = duration
        
        return max(15, min(60, best_duration))
    
    def _analyze_difficulty_progression(self, quiz_results: List[Dict]) -> float:
        """Analyze how well the user adapts to increasing difficulty"""
        if len(quiz_results) < 5:
            return 0.5
        
        # Look at performance on different difficulty levels
        difficulty_performance = {'easy': [], 'medium': [], 'hard': []}
        
        for result in quiz_results:
            difficulty = result.get('difficulty', 'medium')
            score = result.get('score', 0)
            if difficulty in difficulty_performance:
                difficulty_performance[difficulty].append(score)
        
        # Calculate adaptation rate
        easy_avg = np.mean(difficulty_performance['easy']) if difficulty_performance['easy'] else 70
        medium_avg = np.mean(difficulty_performance['medium']) if difficulty_performance['medium'] else 60
        hard_avg = np.mean(difficulty_performance['hard']) if difficulty_performance['hard'] else 50
        
        # Good adaptation means smaller performance drops between difficulty levels
        adaptation_rate = 1 - ((easy_avg - hard_avg) / easy_avg) if easy_avg > 0 else 0.5
        return max(0.1, min(1.0, adaptation_rate))
    
    def _calculate_confidence_score(self, quiz_results: List[Dict]) -> float:
        """Calculate user's overall confidence/competence score"""
        if not quiz_results:
            return 0.5
        
        recent_scores = [result.get('score', 0) for result in quiz_results[-10:]]
        avg_score = np.mean(recent_scores) / 100
        
        # Factor in consistency (lower variance = higher confidence)
        score_variance = np.var(recent_scores) / 10000  # Normalize
        consistency_bonus = max(0, 0.2 - score_variance)
        
        return min(1.0, avg_score + consistency_bonus)
    
    # Additional helper methods
    async def _get_spaced_repetition_schedule(self, user_id: str) -> Dict[str, Any]:
        """Get current spaced repetition schedule"""
        try:
            result = self.supabase.table('spaced_repetition_data').select('*').eq('user_id', user_id).execute()
            sr_data = result.data if result.data else []
            return sr_data or {}
        except:
            return {}
    
    async def _get_topic_performance(self, user_id: str, topic: str) -> float:
        """Get user's historical performance on a specific topic"""
        try:
            result = self.supabase.table('quiz_results').select('*').eq('user_id', user_id).execute()
            quiz_results = result.data if result.data else []
            topic_scores = [
                result.get('score', 0) for result in quiz_results 
                if result.get('topic_name', '').lower() == topic.lower()
            ]
            return np.mean(topic_scores) / 100 if topic_scores else 0.5
        except:
            return 0.5
    
    async def _estimate_topic_difficulty(self, topic: str) -> float:
        """Estimate the inherent difficulty of a topic"""
        # This could be enhanced with ML models or topic analysis
        difficulty_map = {
            'mathematics': 0.8,
            'physics': 0.9,
            'chemistry': 0.8,
            'biology': 0.6,
            'history': 0.5,
            'literature': 0.6,
            'computer science': 0.8,
            'programming': 0.8
        }
        
        topic_lower = topic.lower()
        for key, difficulty in difficulty_map.items():
            if key in topic_lower:
                return difficulty
        
        return 0.6  # Default moderate difficulty
    
    async def _check_prerequisites(self, user_id: str, topic: str) -> bool:
        """Check if user has completed prerequisites for a topic"""
        # Simplified - could be enhanced with a proper prerequisite system
        return True
    
    async def _determine_session_type(self, topic: str, day: int) -> StudySessionType:
        """Determine the type of study session needed"""
        if day == 0:
            return StudySessionType.NEW_CONTENT
        elif day % 3 == 0:
            return StudySessionType.REVIEW
        elif day % 5 == 0:
            return StudySessionType.ASSESSMENT
        else:
            return StudySessionType.PRACTICE
    
    def _calculate_optimal_duration(self, topic: str, analytics: Dict[str, Any]) -> int:
        """Calculate optimal session duration for a topic"""
        base_duration = analytics.get('optimal_session_length', 25)
        
        # Adjust based on topic difficulty
        difficulty_multiplier = {
            'easy': 0.8,
            'medium': 1.0,
            'hard': 1.3
        }
        
        # This would need topic difficulty lookup
        multiplier = difficulty_multiplier.get('medium', 1.0)
        
        return int(base_duration * multiplier)
    
    def _convert_to_priority_enum(self, priority_score: float) -> Priority:
        """Convert priority score to Priority enum"""
        if priority_score >= 0.8:
            return Priority.CRITICAL
        elif priority_score >= 0.6:
            return Priority.HIGH
        elif priority_score >= 0.4:
            return Priority.MEDIUM
        else:
            return Priority.LOW
    
    async def _get_topic_difficulty(self, topic: str) -> str:
        """Get topic difficulty as string"""
        difficulty_score = await self._estimate_topic_difficulty(topic)
        if difficulty_score >= 0.7:
            return 'hard'
        elif difficulty_score >= 0.5:
            return 'medium'
        else:
            return 'easy'
    
    def _calculate_effort_score(self, topic: str, duration: int) -> float:
        """Calculate estimated effort score for a session"""
        base_effort = duration / 60  # Hours
        # Could be enhanced with topic-specific effort calculations
        return base_effort
    
    async def _get_topic_prerequisites(self, topic: str) -> List[str]:
        """Get prerequisites for a topic"""
        # Simplified - could be enhanced with a knowledge graph
        return []
    
    async def _get_topic_objectives(self, topic: str) -> List[str]:
        """Get learning objectives for a topic"""
        # Could be enhanced with curriculum data
        return [f"Master {topic} fundamentals", f"Apply {topic} concepts"]
    
    async def _extract_learning_objectives(self, topics: List[str]) -> List[str]:
        """Extract overall learning objectives"""
        objectives = []
        for topic in topics:
            objectives.extend(await self._get_topic_objectives(topic))
        return objectives
    
    async def _generate_milestones(self, topics: List[str], days: int) -> List[Dict[str, Any]]:
        """Generate progress milestones"""
        milestones = []
        milestone_interval = max(1, days // 4)  # 4 milestones
        
        for i in range(4):
            milestone_day = (i + 1) * milestone_interval
            milestone = {
                'day': milestone_day,
                'title': f"Milestone {i + 1}",
                'target_completion': f"{(i + 1) * 25}% of topics",
                'assessment_recommended': True
            }
            milestones.append(milestone)
        
        return milestones
    
    async def _generate_adaptive_rules(self, user_id: str, analytics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate adaptive adjustment rules"""
        rules = [
            {
                'condition': 'performance_drop_below_70',
                'action': 'reduce_difficulty',
                'description': 'Reduce difficulty if performance drops below 70%'
            },
            {
                'condition': 'streak_above_5_days',
                'action': 'increase_challenge',
                'description': 'Increase challenge after 5-day streak'
            },
            {
                'condition': 'session_incomplete',
                'action': 'adjust_duration',
                'description': 'Adjust session duration if frequently incomplete'
            }
        ]
        return rules
    
    async def _estimate_completion_probability(
        self, 
        topics: List[str], 
        preferences: UserPreferences,
        analytics: Dict[str, Any]
    ) -> Dict[str, float]:
        """Estimate probability of completing the study plan"""
        
        # Factors affecting completion probability
        user_velocity = analytics.get('learning_velocity', 0.7)
        consistency_score = analytics.get('confidence_score', 0.5)
        time_availability = min(1.0, preferences.daily_study_time / 180)  # Normalize to 3 hours
        
        # Calculate overall completion probability
        completion_prob = (user_velocity * 0.4 + consistency_score * 0.3 + time_availability * 0.3)
        
        return {
            'overall': completion_prob,
            'on_time': completion_prob * 0.8,
            'with_extension': min(1.0, completion_prob * 1.2),
            'factors': {
                'learning_velocity': user_velocity,
                'consistency': consistency_score,
                'time_availability': time_availability
            }
        }
    
    async def _save_study_plan(self, user_id: str, study_plan: Dict[str, Any]) -> bool:
        """Save study plan to database"""
        try:
            self.supabase.table('study_plans').upsert({
                'user_id': user_id,
                'plan_data': study_plan,
                'exam_date': study_plan.get('target_date')
            }).execute()
            return True
        except Exception as e:
            print(f"Error saving study plan: {e}")
            return False

# Global instance
study_plan_generator = StudyPlanGenerator()
