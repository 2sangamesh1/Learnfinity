"""
Gamification System - Streaks, badges, and achievement tracking
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum
from dataclasses import dataclass
import json
from app.core.supabase_client import supabase_client

class BadgeType(Enum):
    STREAK = "streak"
    PERFORMANCE = "performance"
    CONSISTENCY = "consistency"
    MILESTONE = "milestone"
    SPECIAL = "special"

class BadgeRarity(Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"

@dataclass
class Badge:
    id: str
    name: str
    description: str
    icon: str
    badge_type: BadgeType
    rarity: BadgeRarity
    criteria: Dict[str, Any]
    points: int
    unlocked_at: Optional[datetime] = None

@dataclass
class Achievement:
    id: str
    name: str
    description: str
    progress: int
    target: int
    completed: bool
    reward_points: int
    reward_badge: Optional[str] = None
    completed_at: Optional[datetime] = None

class GamificationService:
    """Service for managing user gamification data"""
    
    def __init__(self):
        self.badges = self._initialize_badges()
        self.achievements = self._initialize_achievements()
        self.supabase = supabase_client.get_client()
    
    def _initialize_badges(self) -> Dict[str, Badge]:
        """Initialize all available badges"""
        badges = {}
        
        # Streak Badges
        streak_badges = [
            Badge("streak_3", "Getting Started", "Complete 3 days in a row", "🔥", BadgeType.STREAK, BadgeRarity.COMMON, {"streak_days": 3}, 50),
            Badge("streak_7", "Week Warrior", "Complete 7 days in a row", "⚡", BadgeType.STREAK, BadgeRarity.UNCOMMON, {"streak_days": 7}, 100),
            Badge("streak_14", "Fortnight Fighter", "Complete 14 days in a row", "💪", BadgeType.STREAK, BadgeRarity.RARE, {"streak_days": 14}, 200),
            Badge("streak_30", "Monthly Master", "Complete 30 days in a row", "👑", BadgeType.STREAK, BadgeRarity.EPIC, {"streak_days": 30}, 500),
            Badge("streak_100", "Centurion", "Complete 100 days in a row", "🏆", BadgeType.STREAK, BadgeRarity.LEGENDARY, {"streak_days": 100}, 1000),
        ]
        
        # Performance Badges
        performance_badges = [
            Badge("perfect_score", "Perfectionist", "Score 100% on a quiz", "⭐", BadgeType.PERFORMANCE, BadgeRarity.COMMON, {"perfect_scores": 1}, 75),
            Badge("high_performer", "High Achiever", "Score 90%+ on 10 quizzes", "🎯", BadgeType.PERFORMANCE, BadgeRarity.UNCOMMON, {"high_scores": 10}, 150),
            Badge("quiz_master", "Quiz Master", "Score 85%+ on 50 quizzes", "🧠", BadgeType.PERFORMANCE, BadgeRarity.RARE, {"consistent_high_scores": 50}, 300),
            Badge("knowledge_guru", "Knowledge Guru", "Score 80%+ on 100 quizzes", "🎓", BadgeType.PERFORMANCE, BadgeRarity.EPIC, {"guru_scores": 100}, 600),
        ]
        
        # Consistency Badges
        consistency_badges = [
            Badge("early_bird", "Early Bird", "Study before 8 AM for 5 days", "🌅", BadgeType.CONSISTENCY, BadgeRarity.UNCOMMON, {"early_sessions": 5}, 100),
            Badge("night_owl", "Night Owl", "Study after 9 PM for 5 days", "🦉", BadgeType.CONSISTENCY, BadgeRarity.UNCOMMON, {"late_sessions": 5}, 100),
            Badge("weekend_warrior", "Weekend Warrior", "Study on 10 weekends", "⚔️", BadgeType.CONSISTENCY, BadgeRarity.RARE, {"weekend_sessions": 10}, 200),
            Badge("daily_grind", "Daily Grind", "Study every day for a month", "💼", BadgeType.CONSISTENCY, BadgeRarity.EPIC, {"daily_month": 30}, 400),
        ]
        
        # Milestone Badges
        milestone_badges = [
            Badge("first_quiz", "First Steps", "Complete your first quiz", "👶", BadgeType.MILESTONE, BadgeRarity.COMMON, {"quizzes_completed": 1}, 25),
            Badge("quiz_veteran", "Quiz Veteran", "Complete 50 quizzes", "🎖️", BadgeType.MILESTONE, BadgeRarity.UNCOMMON, {"quizzes_completed": 50}, 125),
            Badge("quiz_legend", "Quiz Legend", "Complete 200 quizzes", "🏅", BadgeType.MILESTONE, BadgeRarity.RARE, {"quizzes_completed": 200}, 250),
            Badge("study_hours_10", "Dedicated Learner", "Study for 10 hours total", "📚", BadgeType.MILESTONE, BadgeRarity.COMMON, {"study_hours": 10}, 50),
            Badge("study_hours_100", "Study Marathon", "Study for 100 hours total", "🏃", BadgeType.MILESTONE, BadgeRarity.EPIC, {"study_hours": 100}, 500),
        ]
        
        # Special Badges
        special_badges = [
            Badge("comeback_kid", "Comeback Kid", "Improve score by 30% after a low performance", "📈", BadgeType.SPECIAL, BadgeRarity.RARE, {"comeback_improvement": 0.3}, 200),
            Badge("topic_master", "Topic Master", "Achieve 90%+ average in any topic", "🎯", BadgeType.SPECIAL, BadgeRarity.EPIC, {"topic_mastery": 0.9}, 400),
            Badge("speed_demon", "Speed Demon", "Complete a quiz in under 2 minutes", "💨", BadgeType.SPECIAL, BadgeRarity.UNCOMMON, {"fast_completion": 120}, 150),
            Badge("multitasker", "Multitasker", "Study 5 different topics in one day", "🎭", BadgeType.SPECIAL, BadgeRarity.RARE, {"topics_per_day": 5}, 250),
        ]
        
        all_badges = streak_badges + performance_badges + consistency_badges + milestone_badges + special_badges
        
        for badge in all_badges:
            badges[badge.id] = badge
        
        return badges
    
    def _initialize_achievements(self) -> Dict[str, Achievement]:
        """Initialize all available achievements"""
        achievements = {}
        
        achievement_list = [
            Achievement("quiz_novice", "Quiz Novice", "Complete 10 quizzes", 0, 10, False, 100, "quiz_veteran"),
            Achievement("streak_starter", "Streak Starter", "Maintain a 5-day streak", 0, 5, False, 75, "streak_7"),
            Achievement("perfect_week", "Perfect Week", "Score 80%+ every day for a week", 0, 7, False, 200, None),
            Achievement("topic_explorer", "Topic Explorer", "Study 10 different topics", 0, 10, False, 150, None),
            Achievement("consistency_king", "Consistency King", "Study for 30 consecutive days", 0, 30, False, 300, "daily_grind"),
            Achievement("improvement_champion", "Improvement Champion", "Improve average score by 20%", 0, 20, False, 250, None),
            Achievement("milestone_100", "Centurion", "Reach 100 total study sessions", 0, 100, False, 1000, "milestone_100"),
            Achievement("social_learner", "Social Learner", "Share 10 achievements", 0, 10, False, 150, "social_learner"),
            Achievement("feedback_champion", "Feedback Champion", "Provide feedback 25 times", 0, 25, False, 300, "feedback_champion"),
        ]
        
        for achievement in achievement_list:
            achievements[achievement.id] = achievement
        
        return achievements
    
    async def get_user_gamification_data(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive gamification data for a user"""
        
        # Get user's current streak
        current_streak = await self._calculate_current_streak(user_id)
        longest_streak = await self._calculate_longest_streak(user_id)
        
        # Get user's badges
        user_badges = await self._get_user_badges(user_id)
        
        # Get user's achievements
        user_achievements = await self._get_user_achievements(user_id)
        
        # Calculate total points
        total_points = sum(badge.points for badge in user_badges if badge.unlocked_at)
        total_points += sum(ach.reward_points for ach in user_achievements if ach.completed)
        
        # Get user level based on points
        level_info = self._calculate_user_level(total_points)
        
        # Get recent activity for streak calculation
        recent_activity = await self._get_recent_activity(user_id)
        
        return {
            "user_id": user_id,
            "level": level_info["level"],
            "level_name": level_info["level_name"],
            "current_xp": total_points,
            "xp_to_next_level": level_info["xp_to_next"],
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "badges": [
                {
                    "id": badge.id,
                    "name": badge.name,
                    "description": badge.description,
                    "icon": badge.icon,
                    "rarity": badge.rarity.value,
                    "unlocked": badge.unlocked_at is not None,
                    "unlocked_at": badge.unlocked_at.isoformat() if badge.unlocked_at else None,
                    "points": badge.points
                }
                for badge in self.badges.values()
            ],
            "achievements": [
                {
                    "id": ach.id,
                    "name": ach.name,
                    "description": ach.description,
                    "progress": ach.progress,
                    "target": ach.target,
                    "completed": ach.completed,
                    "completed_at": ach.completed_at.isoformat() if ach.completed_at else None,
                    "reward_points": ach.reward_points,
                    "progress_percentage": min(100, (ach.progress / ach.target) * 100)
                }
                for ach in user_achievements
            ],
            "recent_activity": recent_activity,
            "stats": {
                "total_badges": len([b for b in user_badges if b.unlocked_at]),
                "total_achievements": len([a for a in user_achievements if a.completed]),
                "completion_rate": self._calculate_completion_rate(user_achievements)
            }
        }
    
    async def update_user_progress(self, user_id: str, activity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user progress and check for new badges/achievements"""
        
        newly_unlocked = {
            "badges": [],
            "achievements": [],
            "level_up": False
        }
        
        # Update streak
        await self._update_streak_data(user_id, activity_data)
        
        # Check for new badges
        new_badges = await self._check_badge_criteria(user_id, activity_data)
        newly_unlocked["badges"] = new_badges
        
        # Check for achievement progress
        new_achievements = await self._update_achievement_progress(user_id, activity_data)
        newly_unlocked["achievements"] = new_achievements
        
        # Check for level up
        old_level = await self._get_user_level(user_id)
        current_gamification_data = await self.get_user_gamification_data(user_id)
        new_level = current_gamification_data["level"]
        
        if new_level > old_level:
            newly_unlocked["level_up"] = True
            newly_unlocked["new_level"] = new_level
            newly_unlocked["level_name"] = current_gamification_data["level_name"]
        
        return newly_unlocked
    
    async def _calculate_current_streak(self, user_id: str) -> int:
        """Calculate user's current study streak"""
        try:
            # Get user's study sessions from the last 30 days
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            # This would query the database for study sessions
            # For now, we'll use mock data
            study_dates = await self._get_study_dates(user_id, start_date, end_date)
            
            if not study_dates:
                return 0
            
            # Calculate consecutive days from today backwards
            current_date = datetime.now().date()
            streak = 0
            
            while current_date in study_dates:
                streak += 1
                current_date -= timedelta(days=1)
            
            return streak
            
        except Exception as e:
            print(f"Error calculating streak: {e}")
            return 0
    
    async def _calculate_longest_streak(self, user_id: str) -> int:
        """Calculate user's longest study streak"""
        try:
            # Get all study dates for the user
            study_dates = await self._get_all_study_dates(user_id)
            
            if not study_dates:
                return 0
            
            study_dates = sorted(study_dates)
            longest_streak = 0
            current_streak = 1
            
            for i in range(1, len(study_dates)):
                if study_dates[i] - study_dates[i-1] == timedelta(days=1):
                    current_streak += 1
                else:
                    longest_streak = max(longest_streak, current_streak)
                    current_streak = 1
            
            return max(longest_streak, current_streak)
            
        except Exception as e:
            print(f"Error calculating longest streak: {e}")
            return 0
    
    async def _get_user_badges(self, user_id: str) -> List[Badge]:
        """Get user's badge collection with unlock status"""
        try:
            # This would query the database for user's unlocked badges
            # For now, we'll return all badges with mock unlock status
            user_badges = []
            
            for badge in self.badges.values():
                # Mock some badges as unlocked for demonstration
                if badge.id in ["first_quiz", "streak_3", "perfect_score"]:
                    badge.unlocked_at = datetime.now() - timedelta(days=5)
                
                user_badges.append(badge)
            
            return user_badges
            
        except Exception as e:
            print(f"Error getting user badges: {e}")
            return list(self.badges.values())
    
    async def _get_user_achievements(self, user_id: str) -> List[Achievement]:
        """Get user's achievement progress"""
        try:
            # This would query the database for user's achievement progress
            # For now, we'll return achievements with mock progress
            user_achievements = []
            
            for achievement in self.achievements.values():
                # Mock some progress for demonstration
                if achievement.id == "quiz_novice":
                    achievement.progress = 7
                elif achievement.id == "streak_starter":
                    achievement.progress = 3
                elif achievement.id == "topic_explorer":
                    achievement.progress = 4
                
                # Check if completed
                if achievement.progress >= achievement.target and not achievement.completed:
                    achievement.completed = True
                    achievement.completed_at = datetime.now()
                
                user_achievements.append(achievement)
            
            return user_achievements
            
        except Exception as e:
            print(f"Error getting user achievements: {e}")
            return list(self.achievements.values())
    
    def _calculate_user_level(self, total_points: int) -> Dict[str, Any]:
        """Calculate user level based on total points"""
        
        # Level thresholds
        level_thresholds = [
            (0, "Beginner", "🌱"),
            (100, "Learner", "📚"),
            (300, "Student", "🎓"),
            (600, "Scholar", "📖"),
            (1000, "Expert", "🧠"),
            (1500, "Master", "👑"),
            (2500, "Guru", "🏆"),
            (4000, "Legend", "⭐"),
            (6000, "Grandmaster", "💎"),
            (10000, "Transcendent", "🌟")
        ]
        
        current_level = 1
        level_name = "Beginner"
        level_icon = "🌱"
        xp_to_next = 100
        
        for i, (threshold, name, icon) in enumerate(level_thresholds):
            if total_points >= threshold:
                current_level = i + 1
                level_name = name
                level_icon = icon
                
                # Calculate XP needed for next level
                if i + 1 < len(level_thresholds):
                    next_threshold = level_thresholds[i + 1][0]
                    xp_to_next = next_threshold - total_points
                else:
                    xp_to_next = 0  # Max level reached
        
        return {
            "level": current_level,
            "level_name": level_name,
            "level_icon": level_icon,
            "xp_to_next": xp_to_next
        }
    
    async def _get_recent_activity(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's recent activity for gamification display"""
        try:
            # This would query recent quiz results, study sessions, etc.
            # Mock data for demonstration
            recent_activity = [
                {
                    "type": "quiz_completed",
                    "description": "Completed Mathematics quiz with 85%",
                    "points_earned": 25,
                    "timestamp": (datetime.now() - timedelta(hours=2)).isoformat()
                },
                {
                    "type": "streak_milestone",
                    "description": "Reached 3-day study streak!",
                    "points_earned": 50,
                    "timestamp": (datetime.now() - timedelta(days=1)).isoformat()
                },
                {
                    "type": "badge_unlocked",
                    "description": "Unlocked 'Perfect Score' badge",
                    "points_earned": 75,
                    "timestamp": (datetime.now() - timedelta(days=3)).isoformat()
                }
            ]
            
            return recent_activity
            
        except Exception as e:
            print(f"Error getting recent activity: {e}")
            return []
    
    def _calculate_completion_rate(self, achievements: List[Achievement]) -> float:
        """Calculate achievement completion rate"""
        if not achievements:
            return 0.0
        
        completed = sum(1 for ach in achievements if ach.completed)
        return (completed / len(achievements)) * 100
    
    async def _update_streak_data(self, user_id: str, activity_data: Dict[str, Any]):
        """Update user's streak data based on activity"""
        # This would update the database with new streak information
        pass
    
    async def _check_badge_criteria(self, user_id: str, activity_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check if user has earned any new badges"""
        new_badges = []
        
        # Get current user stats
        current_streak = await self._calculate_current_streak(user_id)
        
        # Check streak badges
        for badge in self.badges.values():
            if badge.badge_type == BadgeType.STREAK and not badge.unlocked_at:
                required_streak = badge.criteria.get("streak_days", 0)
                if current_streak >= required_streak:
                    badge.unlocked_at = datetime.now()
                    new_badges.append({
                        "id": badge.id,
                        "name": badge.name,
                        "description": badge.description,
                        "icon": badge.icon,
                        "points": badge.points
                    })
        
        # Check other badge types based on activity_data
        # This would be expanded with more sophisticated criteria checking
        
        return new_badges
    
    async def _update_achievement_progress(self, user_id: str, activity_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Update achievement progress and check for completions"""
        new_achievements = []
        
        # This would update achievement progress based on activity
        # For example, if user completed a quiz, increment quiz-related achievements
        
        return new_achievements
    
    async def _get_user_level(self, user_id: str) -> int:
        """Get user's current level"""
        # This would query the database for user's current level
        return 1  # Mock data
    
    async def _get_study_dates(self, user_id: str, start_date: datetime, end_date: datetime) -> set:
        """Get dates when user studied within a date range"""
        # This would query the database for study session dates
        # Mock data for demonstration
        mock_dates = {
            datetime.now().date(),
            (datetime.now() - timedelta(days=1)).date(),
            (datetime.now() - timedelta(days=2)).date(),
        }
        return mock_dates
    
    async def _get_all_study_dates(self, user_id: str) -> List[datetime]:
        """Get all dates when user studied"""
        # This would query the database for all study session dates
        # Mock data for demonstration
        dates = []
        for i in range(10):
            dates.append((datetime.now() - timedelta(days=i)).date())
        return dates

# Global instance
gamification_system = GamificationService()
