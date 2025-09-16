import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiStar, FiTarget, FiTrendingUp, FiAward, FiX, FiCalendar, FiBarChart } from 'react-icons/fi';

const GamificationPanel = ({ userId }) => {
  const [gamificationData, setGamificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showStreakCalendar, setShowStreakCalendar] = useState(false);

  useEffect(() => {
    fetchGamificationData();
  }, [userId]);

  // Helper function to generate streak calendar
  const generateStreakCalendar = () => {
    const calendar = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      calendar.push({
        date: date.toISOString().split('T')[0],
        completed: Math.random() > 0.3 // Mock completion data
      });
    }
    return calendar;
  };

  const fetchGamificationData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/v1/smart-scheduler/gamification/${userId}`);
      const data = await response.json();
      setGamificationData(data);
    } catch (error) {
      console.error('Error fetching gamification data:', error);
      // Mock data for development
      setGamificationData({
        level: 3,
        level_name: "Scholar",
        current_xp: 450,
        xp_to_next_level: 150,
        current_streak: 5,
        longest_streak: 12,
        streak_calendar: generateStreakCalendar(),
        mastery_levels: {
          "Mathematics": { level: "Proficient", progress: 75 },
          "Physics": { level: "Familiar", progress: 45 },
          "Chemistry": { level: "Beginner", progress: 20 }
        },
        badges: [
          { 
            id: "first_session", 
            name: "First Steps", 
            description: "Complete your first study session. Every journey begins with a single step!", 
            unlocked: true, 
            rarity: "common", 
            points: 25,
            icon: "🎯",
            unlock_date: "2024-01-15"
          },
          { 
            id: "streak_7", 
            name: "Week Warrior", 
            description: "Maintain a 7-day study streak. Consistency is the key to mastery!", 
            unlocked: true, 
            rarity: "uncommon", 
            points: 100,
            icon: "🔥",
            unlock_date: "2024-01-22"
          },
          { 
            id: "perfect_score", 
            name: "Perfectionist", 
            description: "Score 100% on a quiz. Excellence is not a skill, it's an attitude!", 
            unlocked: true, 
            rarity: "rare", 
            points: 150,
            icon: "⭐",
            unlock_date: "2024-01-18"
          },
          { 
            id: "topics_10", 
            name: "Knowledge Seeker", 
            description: "Complete 10 different topics. Curiosity is the engine of achievement!", 
            unlocked: false, 
            rarity: "uncommon", 
            points: 200,
            icon: "📚",
            progress: 7,
            target: 10
          },
          { 
            id: "accuracy_80", 
            name: "Sharp Shooter", 
            description: "Achieve 80%+ accuracy on 5 topics. Precision beats power!", 
            unlocked: false, 
            rarity: "rare", 
            points: 250,
            icon: "🎯",
            progress: 3,
            target: 5
          },
          { 
            id: "reviews_on_time", 
            name: "Time Master", 
            description: "Complete 3 spaced-repetition reviews on time. Timing is everything!", 
            unlocked: false, 
            rarity: "epic", 
            points: 300,
            icon: "⏰",
            progress: 1,
            target: 3
          }
        ],
        achievements: [
          { id: "quiz_novice", name: "Quiz Novice", description: "Complete 10 quizzes", progress: 7, target: 10, completed: false },
          { id: "streak_starter", name: "Streak Starter", description: "Maintain a 5-day streak", progress: 5, target: 5, completed: true },
          { id: "topic_explorer", name: "Topic Explorer", description: "Study 10 different topics", progress: 4, target: 10, completed: false }
        ],
        recent_activity: [
          { type: "quiz_completed", description: "Completed Mathematics quiz with 85%", points_earned: 25 },
          { type: "streak_milestone", description: "Reached 5-day study streak!", points_earned: 50 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!gamificationData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Unable to load gamification data</p>
      </div>
    );
  }

  const { 
    level, 
    level_name, 
    current_xp, 
    xp_to_next_level, 
    current_streak, 
    longest_streak, 
    badges = [], 
    achievements = [], 
    recent_activity = [], 
    mastery_levels = {}, 
    streak_calendar = [] 
  } = gamificationData || {};
  const xpProgress = (current_xp / (current_xp + xp_to_next_level)) * 100;

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'border-gray-500/50 bg-gray-500/10';
      case 'uncommon': return 'border-green-500/50 bg-green-500/10';
      case 'rare': return 'border-blue-500/50 bg-blue-500/10';
      case 'epic': return 'border-purple-500/50 bg-purple-500/10';
      case 'legendary': return 'border-yellow-500/50 bg-yellow-500/10';
      default: return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  const getMasteryColor = (level) => {
    switch (level) {
      case 'Beginner': return 'text-red-400 bg-red-500/10';
      case 'Familiar': return 'text-yellow-400 bg-yellow-500/10';
      case 'Proficient': return 'text-blue-400 bg-blue-500/10';
      case 'Mastered': return 'text-green-400 bg-green-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.6);
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.8);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(107, 114, 128, 0.6) rgba(55, 65, 81, 0.3);
        }
      `}</style>
      <div className="space-y-6">
      {/* Level Progress */}
      <div className="bg-gray-900/70 p-4 rounded-[1.5rem] border border-gray-700/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Level {level} - {level_name}
            </h3>
            <p className="text-sm text-gray-400">{current_xp} / {current_xp + xp_to_next_level} XP</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span className="text-blue-400 font-medium">{Math.round(xpProgress)}%</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${xpProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Enhanced Stats Grid with Fire Icon */}
      <div className="grid grid-cols-2 gap-4">
        <div 
          className="bg-gray-900/70 p-3 rounded-[1.25rem] border border-gray-700/60 flex items-center gap-3 cursor-pointer hover:bg-gray-800/70 transition-colors"
          onClick={() => setShowStreakCalendar(true)}
        >
          <div className="p-2 bg-orange-500/20 rounded-[0.75rem]">
            <span className="text-lg">🔥</span>
          </div>
          <div>
            <p className="text-lg font-bold text-white flex items-center gap-1">
              {current_streak}
              {current_streak >= 7 && <span className="text-orange-400">🔥</span>}
              {current_streak >= 30 && <span className="text-red-400">💯</span>}
            </p>
            <p className="text-xs text-gray-400">Current Streak</p>
          </div>
        </div>
        
        <div className="bg-gray-900/70 p-3 rounded-[1.25rem] border border-gray-700/60 flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-[0.75rem]">
            <span className="text-lg">🏆</span>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{longest_streak}</p>
            <p className="text-xs text-gray-400">Best Streak</p>
          </div>
        </div>
      </div>

      {/* Mastery Levels */}
      <div className="bg-gray-900/70 p-4 rounded-[1.5rem] border border-gray-700/60">
        <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <span className="text-lg">🧠</span>
          Topic Mastery
        </h4>
        <div className="space-y-2">
          {mastery_levels && Object.entries(mastery_levels).map(([topic, data]) => (
            <div key={topic} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{topic}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${data.progress}%` }}
                  ></div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getMasteryColor(data.level)}`}>
                  {data.level}
                </span>
              </div>
            </div>
          ))}
          {(!mastery_levels || Object.keys(mastery_levels).length === 0) && (
            <p className="text-sm text-gray-500 italic">No mastery data available yet.</p>
          )}
        </div>
      </div>

      {/* Enhanced Badges with Click Interaction */}
      <div className="bg-gray-900/70 p-4 rounded-[1.5rem] border border-gray-700/60">
        <h4 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <span className="text-lg">🏅</span>
          Achievements & Badges
        </h4>
        
        <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid grid-cols-3 gap-3 pr-2">
            {badges.map((badge) => (
              <motion.div
                key={badge.id}
                className={`p-3 rounded-[1rem] text-center transition-all duration-200 cursor-pointer hover:scale-105 ${
                  badge.unlocked
                    ? `${getRarityColor(badge.rarity)} border`
                    : 'bg-gray-800/50 border border-gray-600/30'
                }`}
                onClick={() => setSelectedBadge(badge)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-2xl mb-2">
                  {badge.unlocked ? badge.icon : '🔒'}
                </div>
                <p className="text-xs text-gray-300 truncate font-medium">{badge.name}</p>
                {badge.unlocked && (
                  <p className="text-xs text-gray-500 mt-1">{badge.points} pts</p>
                )}
                {!badge.unlocked && badge.progress && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                        style={{ width: `${(badge.progress / badge.target) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{badge.progress}/{badge.target}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900/70 p-3 rounded-[1.25rem] border border-gray-700/60 text-center">
          <div className="text-lg mb-1">🎖️</div>
          <p className="text-lg font-bold text-blue-400">{badges.filter(b => b.unlocked).length}</p>
          <p className="text-xs text-gray-400">Badges</p>
        </div>
        
        <div className="bg-gray-900/70 p-3 rounded-[1.25rem] border border-gray-700/60 text-center">
          <div className="text-lg mb-1">🎯</div>
          <p className="text-lg font-bold text-green-400">{achievements.filter(a => a.completed).length}</p>
          <p className="text-xs text-gray-400">Goals</p>
        </div>
        
        <div className="bg-gray-900/70 p-3 rounded-[1.25rem] border border-gray-700/60 text-center">
          <div className="text-lg mb-1">⚡</div>
          <p className="text-lg font-bold text-amber-400">{recent_activity.length}</p>
          <p className="text-xs text-gray-400">Activities</p>
        </div>
      </div>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`bg-gray-800 p-6 rounded-[1.5rem] shadow-2xl border max-w-sm w-full ${getRarityColor(selectedBadge.rarity)}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="text-4xl">{selectedBadge.unlocked ? selectedBadge.icon : '🔒'}</div>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{selectedBadge.name}</h3>
              <p className="text-sm text-gray-300 mb-4">{selectedBadge.description}</p>
              
              <div className="flex justify-between items-center text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(selectedBadge.rarity)}`}>
                  {selectedBadge.rarity.toUpperCase()}
                </span>
                <span className="text-blue-400 font-medium">{selectedBadge.points} points</span>
              </div>
              
              {selectedBadge.unlocked && selectedBadge.unlock_date && (
                <p className="text-xs text-gray-500 mt-3">
                  Unlocked on {new Date(selectedBadge.unlock_date).toLocaleDateString()}
                </p>
              )}
              
              {!selectedBadge.unlocked && selectedBadge.progress && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Progress</span>
                    <span className="text-blue-400">{selectedBadge.progress}/{selectedBadge.target}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(selectedBadge.progress / selectedBadge.target) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak Calendar Modal */}
      <AnimatePresence>
        {showStreakCalendar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowStreakCalendar(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-800 p-6 rounded-[1.5rem] shadow-2xl border border-gray-700 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  Study Streak Calendar
                </h3>
                <button
                  onClick={() => setShowStreakCalendar(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                  <div key={day} className="text-center text-xs text-gray-400 p-1 font-medium">
                    {day}
                  </div>
                ))}
                {streak_calendar && streak_calendar.map((day, index) => (
                  <div
                    key={index}
                    className={`w-8 h-8 rounded-[0.75rem] flex items-center justify-center text-xs font-medium ${
                      day.completed
                        ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                        : 'bg-gray-700/50 text-gray-500'
                    }`}
                  >
                    {new Date(day.date).getDate()}
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500/30 border border-green-500/50 rounded-md"></div>
                  <span className="text-gray-300">Study completed</span>
                </div>
                <span className="text-orange-400 font-medium">
                  🔥 {current_streak} day streak
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
};

export default GamificationPanel;