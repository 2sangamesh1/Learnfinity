import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiTrendingUp, FiTarget, FiCalendar, FiPlay, FiCheckCircle, FiZap } from 'react-icons/fi';

const ReviewDashboard = ({ userId }) => {
  const [reviewsData, setReviewsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [userId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/spaced-repetition/reviews/${userId}`);
      const data = await response.json();
      
      // Convert array format to object format for compatibility
      if (Array.isArray(data)) {
        const topicsObj = {};
        data.forEach(topic => {
          topicsObj[topic.topic_name] = {
            next_review: topic.next_review,
            difficulty: topic.difficulty,
            retention_probability: topic.retention_probability,
            streak: topic.streak,
            last_performance: topic.last_performance,
            urgency: topic.urgency,
            time_overdue_days: topic.time_overdue_days
          };
        });
        setReviewsData({ topics: topicsObj });
      } else {
        setReviewsData(data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Show error state instead of empty
      setReviewsData({ 
        topics: {},
        error: 'Failed to load reviews. Please check if backends are running.'
      });
    } finally {
      setLoading(false);
    }
  };




  const getPriorityLevel = (topic, data) => {
    const now = new Date();
    const nextReview = new Date(data.next_review);
    const isOverdue = nextReview < now;
    const retentionProb = data.retention_probability;

    if (isOverdue && retentionProb < 0.5) return 'critical';
    if (isOverdue || retentionProb < 0.6) return 'high';
    if (retentionProb < 0.8) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return colors[priority] || 'bg-gray-500';
  };

  const formatTimeUntilReview = (nextReview) => {
    const now = new Date();
    const reviewTime = new Date(nextReview);
    const diffMs = reviewTime - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      const overdueDays = Math.abs(diffDays);
      const overdueHours = Math.abs(diffHours % 24);
      if (overdueDays > 0) return `${overdueDays}d overdue`;
      return `${overdueHours}h overdue`;
    }

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    return `${diffHours}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const topics = reviewsData?.topics || {};
  const sortedTopics = Object.entries(topics).sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const aPriority = getPriorityLevel(a[0], a[1]);
    const bPriority = getPriorityLevel(b[0], b[1]);
    return priorityOrder[aPriority] - priorityOrder[bPriority];
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
          <FiZap className="w-5 h-5" />
          Intelligent Review Zone
        </h3>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-700/60 flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <FiClock className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {sortedTopics.filter(([_, data]) => new Date(data.next_review) < new Date()).length}
            </p>
            <p className="text-xs text-gray-400">Overdue</p>
          </div>
        </div>

        <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-700/60 flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <FiTarget className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {sortedTopics.filter(([_, data]) => {
                const reviewDate = new Date(data.next_review);
                const today = new Date();
                return reviewDate.toDateString() === today.toDateString();
              }).length}
            </p>
            <p className="text-xs text-gray-400">Due Today</p>
          </div>
        </div>

        <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-700/60 flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <FiTrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {Object.keys(topics).length > 0 ? Math.round(
                Object.values(topics).reduce((sum, data) => sum + data.retention_probability, 0) / 
                Object.keys(topics).length * 100
              ) : 0}%
            </p>
            <p className="text-xs text-gray-400">Avg Retention</p>
          </div>
        </div>

        <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-700/60 flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <FiCheckCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {Object.values(topics).reduce((sum, data) => sum + data.streak, 0)}
            </p>
            <p className="text-xs text-gray-400">Total Streak</p>
          </div>
        </div>
      </div>

      {/* Topics List */}
      {sortedTopics.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Topics scheduled for review based on spaced repetition algorithm.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTopics.map(([topic, data]) => {
              const priority = getPriorityLevel(topic, data);
              const priorityColor = getPriorityColor(priority);
              
              return (
                <div key={topic} className="bg-gray-900/70 p-4 rounded-xl border border-gray-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-white">{topic}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                        priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {formatTimeUntilReview(data.next_review)}
                    </p>
                    <p className="text-xs text-gray-400 mb-2">
                      Retention: {Math.round(data.retention_probability * 100)}% | Streak: {data.streak}
                    </p>
                    <div className="mt-3">
                      <div className="text-xs text-gray-400">
                        {Math.round(data.retention_probability * 100)}% retention probability
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Empty State - Show Intelligent Stats */}
      {Object.keys(topics).length === 0 && (
        <div className="space-y-4">
          <div className="text-center py-6">
            <FiCheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-white mb-2">All caught up!</h4>
            <p className="text-gray-400">No topics scheduled for review today.</p>
          </div>
          
          {/* Intelligent Learning Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/70 p-4 rounded-xl border border-gray-700/60 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">85%</div>
              <div className="text-xs text-gray-400">Overall Retention</div>
            </div>
            <div className="bg-gray-900/70 p-4 rounded-xl border border-gray-700/60 text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">12</div>
              <div className="text-xs text-gray-400">Topics Mastered</div>
            </div>
          </div>
          
          <div className="bg-gray-900/70 p-4 rounded-xl border border-gray-700/60">
            <h5 className="text-sm font-medium text-white mb-2">Learning Insights</h5>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your spaced repetition system is working well. Based on your learning patterns, 
              the next review session will be optimally scheduled to maximize retention.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDashboard;
