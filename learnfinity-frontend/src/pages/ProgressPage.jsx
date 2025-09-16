// src/pages/ProgressPage.jsx

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
    ResponsiveContainer, CartesianGrid, ReferenceLine, Legend 
} from "recharts";
import { FiTrendingUp, FiCheckCircle, FiAward, FiMessageSquare, FiTarget, FiBarChart } from 'react-icons/fi';
import { useNavigate } from "react-router-dom";

import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

// --- Components and helpers (Unchanged) ---
const pageVariants = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
const containerVariants = { initial: {}, animate: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
const itemVariants = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

// BentoBox Component for consistency
const BentoBox = ({ children, className = "" }) => (
  <motion.div
    variants={itemVariants}
    className={`bg-gray-800/40 backdrop-blur-sm border border-gray-600/50 rounded-[2rem] p-6 ${className}`}
  >
    {children}
  </motion.div>
);

const StatCard = ({ icon, label, value, color = "amber" }) => {
  const colorClasses = {
    amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30"
  };
  
  return (
    <div className={`${colorClasses[color]} border rounded-[1rem] p-4 flex items-center gap-3`}>
      <div className="text-2xl">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  );
};

const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 shadow-lg text-sm">
                <p className="font-bold text-amber-400 text-md">{data.topic}</p>
                <p className="text-gray-300 mt-2">Score: <span className="font-semibold text-white">{data.score}%</span></p>
                <p className="text-gray-300">Difficulty: <span className="font-semibold text-white capitalize">{data.difficulty}</span></p>
                <p className="text-gray-400 text-xs mt-1">{data.date}</p>
            </div>
        );
    }
    return null;
};

const getBarColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
};

const ProgressPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [progressData, setProgressData] = useState({
        averageScore: 0,
        quizzesTaken: 0,
        bestScore: 0,
        individualScores: [],
        scoreByTopic: [],
        history: [],
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProgressData = async () => {
            if (!user) return;
            const { data: history, error } = await supabase.from('quiz_results').select('score, quiz_timestamp, topic_name, difficulty').eq('user_id', user.id).order('quiz_timestamp', { ascending: true });
            if (error) {
                console.error("Error fetching progress data:", error);
                setIsLoading(false);
                return;
            }
            if (history && history.length > 0) {
                const totalScore = history.reduce((sum, quiz) => sum + quiz.score, 0);
                const avgScore = Math.round(totalScore / history.length);
                const bestScore = Math.max(...history.map(quiz => quiz.score));
                const individualScores = history.map((quiz, index) => ({
                    name: `Quiz #${index + 1}`,
                    topic: quiz.topic_name,
                    score: quiz.score,
                    difficulty: quiz.difficulty || 'N/A',
                    date: new Date(quiz.quiz_timestamp).toLocaleDateString(),
                }));
                const topicScores = {};
                history.forEach(quiz => {
                    if (!topicScores[quiz.topic_name]) { topicScores[quiz.topic_name] = { totalScore: 0, count: 0 }; }
                    topicScores[quiz.topic_name].totalScore += quiz.score;
                    topicScores[quiz.topic_name].count += 1;
                });
                const scoreByTopic = Object.keys(topicScores).map(topic => ({
                    topic: topic,
                    average: Math.round(topicScores[topic].totalScore / topicScores[topic].count),
                }));
                setProgressData({
                    averageScore: avgScore,
                    quizzesTaken: history.length,
                    bestScore: bestScore,
                    individualScores: individualScores,
                    scoreByTopic: scoreByTopic,
                    history: [...history].reverse(),
                });
            }
            setIsLoading(false);
        };
        fetchProgressData();
    }, [user]);
    
    if (isLoading) { 
      return (
        <div className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 rounded-[2rem] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading your progress...</p>
          </div>
        </div>
      );
    }
    
    if (progressData.quizzesTaken === 0) { 
      return (
        <div className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 rounded-[2rem]">
          <motion.div 
            initial="initial" 
            animate="animate" 
            exit="exit" 
            variants={pageVariants} 
            className="text-center py-20"
          >
            <BentoBox className="max-w-2xl mx-auto text-center">
              <span className="text-6xl mb-6 block">📊</span>
              <h1 className="text-3xl font-bold text-white mb-4">No Progress Data Yet</h1>
              <p className="text-gray-400 mb-8 text-lg leading-relaxed">
                Start taking quizzes to see your learning progress, track improvements, and identify areas for growth.
              </p>
              <button 
                onClick={() => navigate('/quizzes')} 
                className="px-8 py-4 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-semibold rounded-[1rem] transition-all hover:scale-105 flex items-center gap-3 mx-auto"
              >
                <FiTarget className="w-5 h-5" />
                Take Your First Quiz
              </button>
            </BentoBox>
          </motion.div>
        </div>
      );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 rounded-[2rem]">
          <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={{ duration: 0.3 }}>
            <motion.div variants={containerVariants}>
              {/* Header Section */}
              <BentoBox className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-purple-500/20 rounded-[1rem]">
                    <span className="text-3xl">📈</span>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white">Progress Analytics</h1>
                    <p className="text-lg text-gray-400 mt-2">Track your learning journey and celebrate your achievements</p>
                  </div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard 
                    icon={<span>📊</span>} 
                    label="Average Score" 
                    value={`${progressData.averageScore}%`} 
                    color="blue"
                  />
                  <StatCard 
                    icon={<span>✅</span>} 
                    label="Quizzes Taken" 
                    value={progressData.quizzesTaken} 
                    color="green"
                  />
                  <StatCard 
                    icon={<span>🏆</span>} 
                    label="Best Score" 
                    value={`${progressData.bestScore}%`} 
                    color="amber"
                  />
                </div>
              </BentoBox>

              {/* Quiz Scores Chart */}
              <BentoBox className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl">📊</span>
                  <h2 className="text-2xl font-bold text-white">Quiz Performance Timeline</h2>
                </div>
                <div className="bg-gray-800/30 p-4 rounded-[1rem] border border-gray-600/30">
                  <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                      <BarChart data={progressData.individualScores} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={false} />
                        <YAxis stroke="#9ca3af" domain={[0, 100]} unit="%" />
                        <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} content={<CustomBarTooltip />} />
                        <ReferenceLine y={progressData.averageScore} label={{ value: `Avg`, position: 'insideTopRight', fill: '#64748b' }} stroke="#64748b" strokeDasharray="4 4" />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                          {progressData.individualScores.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </BentoBox>

              {/* Topic Performance Chart */}
              <BentoBox className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl">🎯</span>
                  <h2 className="text-2xl font-bold text-white">Performance by Topic</h2>
                </div>
                <div className="bg-gray-800/30 p-4 rounded-[1rem] border border-gray-600/30">
                  <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                      <BarChart data={progressData.scoreByTopic} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="topic" stroke="#9ca3af" tick={{ fontSize: 12 }} interval={0} />
                        <YAxis stroke="#9ca3af" domain={[0, 100]} unit="%" />
                        <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }} />
                        <Legend />
                        <Bar dataKey="average" name="Average Score" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </BentoBox>

              {/* Quiz History */}
              <BentoBox>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl">📋</span>
                  <h2 className="text-2xl font-bold text-white">Recent Quiz History</h2>
                </div>
                <div className="bg-gray-800/30 rounded-[1rem] border border-gray-600/30 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="p-4 text-sm font-semibold text-gray-300">Date</th>
                          <th className="p-4 text-sm font-semibold text-gray-300">Topic</th>
                          <th className="p-4 text-sm font-semibold text-gray-300">Difficulty</th>
                          <th className="p-4 text-sm font-semibold text-gray-300">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {progressData.history.slice(0, 10).map((quiz, index) => (
                          <tr key={index} className="border-b border-gray-600/30 last:border-b-0 hover:bg-gray-700/30 transition-colors">
                            <td className="p-4 text-gray-300">
                              {new Date(quiz.quiz_timestamp).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-gray-300 font-medium">{quiz.topic_name}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                quiz.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                quiz.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                quiz.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {quiz.difficulty || 'N/A'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`font-bold text-lg ${
                                quiz.score >= 80 ? 'text-green-400' :
                                quiz.score >= 60 ? 'text-amber-400' :
                                'text-red-400'
                              }`}>
                                {quiz.score}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {progressData.history.length > 10 && (
                    <div className="p-4 text-center border-t border-gray-600/30">
                      <p className="text-gray-400 text-sm">
                        Showing latest 10 results • Total: {progressData.history.length} quizzes
                      </p>
                    </div>
                  )}
                </div>
              </BentoBox>
            </motion.div>
          </motion.div>
        </div>
    );
};

export default ProgressPage;