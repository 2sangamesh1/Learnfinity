// src/pages/AllQuizzesPage.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiGrid, FiFeather, FiZap, FiAward, FiX } from "react-icons/fi";
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

// --- Animation Variants ---
const pageVariants = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
const containerVariants = { initial: {}, animate: { transition: { staggerChildren: 0.07 } } };
const itemVariants = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

// BentoBox Component for consistency
const BentoBox = ({ children, className = "" }) => (
  <motion.div
    variants={itemVariants}
    className={`bg-gray-800/40 backdrop-blur-sm border border-gray-600/50 rounded-[2rem] p-6 flex flex-col ${className}`}
  >
    {children}
  </motion.div>
);

// Enhanced TopicCard with premium styling
const TopicCard = ({ topic, onClick }) => (
    <motion.div 
        variants={itemVariants} 
        whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
        whileTap={{ scale: 0.98 }}
        className="bg-gray-800/30 backdrop-blur-sm border border-gray-600/40 rounded-[1.5rem] p-6 flex flex-col hover:border-amber-500/50 transition-all duration-300 group cursor-pointer"
        onClick={() => onClick(topic)}
    >
        <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/20 rounded-[1rem] text-amber-400 group-hover:bg-amber-500/30 transition-colors">
                <span className="text-2xl">📚</span>
            </div>
            <div className="flex-1">
                <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">{topic}</h3>
                <p className="text-xs text-gray-500 mt-1">Interactive Quiz</p>
            </div>
        </div>
        <p className="text-gray-400 mb-6 text-sm flex-grow leading-relaxed">Test your knowledge and track your progress with adaptive questions tailored to your learning level.</p>
        <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Ready</span>
            </div>
            <div className="flex items-center gap-2 text-amber-400 font-medium text-sm group-hover:text-amber-300 transition-colors">
                <span>Start Quiz</span>
                <FiZap className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
        </div>
    </motion.div>
);

const AllQuizzesPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // ADDED: Get user from AuthContext
    // CHANGED: State is now for topics, not subjects
    const [topics, setTopics] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState('');

    useEffect(() => {
        const fetchUserTopics = async () => {
            if (!user) {
                return;
            }

            try {
                // Query the 'user_topics' table for the current user's topics
                const { data, error } = await supabase
                    .from('user_topics')
                    .select('topic_name, subject_name')
                    .eq('user_id', user.id);

                if (error) {
                    console.error('Error fetching user topics:', error);
                    return;
                }

                if (data) {
                    // Convert to array of topic names
                    setTopics(data.map(item => item.topic_name));
                }
            } catch (err) {
                console.error('An unexpected error occurred:', err);
            }
        };

        fetchUserTopics();
    }, [user]);

    const handleQuizClick = (topic) => {
        setSelectedTopic(topic);
        setIsModalOpen(true);
    };

    const handleDifficultySelect = (difficulty) => {
        setIsModalOpen(false);
        navigate(`/quiz/${encodeURIComponent(selectedTopic)}/${difficulty}`);
    };

    return (
        <>
            <div className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 rounded-[2rem]">
                <motion.div
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageVariants}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div variants={containerVariants}>
                        {/* Header Section */}
                        <BentoBox className="mb-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-amber-500/20 rounded-[1rem]">
                                    <span className="text-3xl">🎯</span>
                                </div>
                                <div>
                                    <motion.h1 variants={itemVariants} className="text-4xl font-bold text-white">
                                        Quiz Center
                                    </motion.h1>
                                    <motion.p variants={itemVariants} className="text-lg text-gray-400 mt-2">
                                        Challenge yourself with adaptive quizzes tailored to your learning progress
                                    </motion.p>
                                </div>
                            </div>
                            
                            {/* Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                <div className="bg-gray-800/30 p-4 rounded-[1rem] border border-gray-600/30">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">📊</span>
                                        <div>
                                            <p className="text-2xl font-bold text-blue-400">{topics.length}</p>
                                            <p className="text-sm text-gray-400">Available Topics</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-800/30 p-4 rounded-[1rem] border border-gray-600/30">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">⚡</span>
                                        <div>
                                            <p className="text-2xl font-bold text-amber-400">3</p>
                                            <p className="text-sm text-gray-400">Difficulty Levels</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-800/30 p-4 rounded-[1rem] border border-gray-600/30">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🏆</span>
                                        <div>
                                            <p className="text-2xl font-bold text-green-400">Ready</p>
                                            <p className="text-sm text-gray-400">System Status</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </BentoBox>

                        {/* Topics Grid */}
                        <BentoBox>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-2xl">📚</span>
                                <h2 className="text-2xl font-bold text-white">Select Your Topic</h2>
                            </div>
                            
                            {topics.length > 0 ? (
                                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {topics.map((topic, index) => (
                                       <TopicCard key={index} topic={topic} onClick={handleQuizClick} />
                                    ))}
                                </motion.div>
                            ) : (
                                <div className="text-center py-12">
                                    <span className="text-6xl mb-4 block">📖</span>
                                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No Topics Available</h3>
                                    <p className="text-gray-500">Add some topics to your study plan to start taking quizzes!</p>
                                </div>
                            )}
                        </BentoBox>
                    </motion.div>
                </motion.div>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
                    onClick={() => setIsModalOpen(false)}
                  >
                    <motion.div 
                      onClick={(e) => e.stopPropagation()} 
                      className="bg-gray-800/90 backdrop-blur-md p-8 rounded-[2rem] shadow-2xl border border-gray-600/50 w-full max-w-3xl"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <span className="text-3xl">🎯</span>
                                    Choose Your Challenge
                                </h3>
                                <p className="text-gray-400 mt-2">Topic: <span className="text-amber-400 font-medium">"{selectedTopic}"</span></p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-[0.75rem]"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <motion.button 
                                onClick={() => handleDifficultySelect('easy')} 
                                className="p-6 rounded-[1.5rem] bg-gray-800/50 border-2 border-gray-600/30 hover:border-blue-500/70 hover:bg-blue-500/10 transition-all group"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-[1rem] flex items-center justify-center">
                                        <FiFeather className="text-blue-400 transition-transform group-hover:scale-110" size={28} />
                                    </div>
                                    <h4 className="font-bold text-xl text-white mb-2">Easy</h4>
                                    <p className="text-sm text-gray-400 leading-relaxed">Perfect for reviewing fundamentals and building confidence</p>
                                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-400">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                        <span>5-8 Questions</span>
                                    </div>
                                </div>
                            </motion.button>
                            
                            <motion.button 
                                onClick={() => handleDifficultySelect('medium')} 
                                className="p-6 rounded-[1.5rem] bg-gray-800/50 border-2 border-gray-600/30 hover:border-amber-500/70 hover:bg-amber-500/10 transition-all group"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 rounded-[1rem] flex items-center justify-center">
                                        <FiZap className="text-amber-400 transition-transform group-hover:scale-110" size={28} />
                                    </div>
                                    <h4 className="font-bold text-xl text-white mb-2">Medium</h4>
                                    <p className="text-sm text-gray-400 leading-relaxed">Standard challenge to test your understanding and application</p>
                                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-amber-400">
                                        <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                                        <span>8-12 Questions</span>
                                    </div>
                                </div>
                            </motion.button>
                            
                            <motion.button 
                                onClick={() => handleDifficultySelect('hard')} 
                                className="p-6 rounded-[1.5rem] bg-gray-800/50 border-2 border-gray-600/30 hover:border-red-500/70 hover:bg-red-500/10 transition-all group"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-[1rem] flex items-center justify-center">
                                        <FiAward className="text-red-400 transition-transform group-hover:scale-110" size={28} />
                                    </div>
                                    <h4 className="font-bold text-xl text-white mb-2">Hard</h4>
                                    <p className="text-sm text-gray-400 leading-relaxed">Advanced questions to push your limits and achieve mastery</p>
                                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-red-400">
                                        <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                                        <span>10-15 Questions</span>
                                    </div>
                                </div>
                            </motion.button>
                        </div>
                    </motion.div>
                  </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AllQuizzesPage;