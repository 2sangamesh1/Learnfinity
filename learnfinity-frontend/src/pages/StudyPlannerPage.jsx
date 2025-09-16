// src/pages/StudyPlannerPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// UPDATED: Added new icons for the redesigned UI
import { FiCalendar, FiCheckSquare, FiSquare, FiFeather, FiZap, FiAward, FiBook, FiClock } from 'react-icons/fi';

// --- NEW IMPORTS ---
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

// --- NO CHANGES TO ANIMATION VARIANTS ---
const pageVariants = { initial: { opacity: 0, x: "-2vw" }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: "2vw" } };
const containerVariants = { initial: {}, in: { transition: { staggerChildren: 0.1 } } };
const itemVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 } };
const modalContainerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const modalItemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

// ENHANCED: Helper component for individual topics with rich metadata
const TopicPill = ({ topic, isCompleted, onToggle, onQuiz }) => {
    const topicName = typeof topic === 'object' ? topic.topic : topic;
    const topicData = typeof topic === 'object' ? topic : { topic, difficulty: 3, estimated_hours: 2 };
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg transition-all duration-300 hover:bg-slate-700/50"
        >
            <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={onToggle}>
                {isCompleted ? <FiCheckSquare className="text-green-400 shrink-0" size={20}/> : <FiSquare className="text-neutral-500 shrink-0" size={20}/>}
                <div className="flex-1">
                    <span className={`text-neutral-200 ${isCompleted ? 'line-through text-neutral-500' : ''}`}>
                        {topicName}
                    </span>
                    {topicData.subject && (
                        <span className="text-xs text-blue-400 ml-2">({topicData.subject})</span>
                    )}
                    <div className="flex gap-2 mt-1">
                        {topicData.difficulty && (
                            <span className={`px-2 py-0.5 rounded text-xs ${
                                topicData.difficulty <= 2 ? 'bg-green-500/20 text-green-400' :
                                topicData.difficulty <= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                            }`}>
                                {topicData.difficulty}/5
                            </span>
                        )}
                        {topicData.estimated_hours && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                {topicData.estimated_hours}h
                            </span>
                        )}
                        {topicData.category && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                                {topicData.category}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <button 
                onClick={onQuiz} 
                className="bg-sky-500/10 text-sky-400 font-semibold py-1 px-3 rounded-md border border-sky-500/20 hover:bg-sky-500 hover:text-white transition-colors text-xs shrink-0 ml-4"
            >
                Quiz Me
            </button>
        </motion.div>
    );
};


const StudyPlannerPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get the current user

  const [plan, setPlan] = useState(null);
  const [completedTopics, setCompletedTopics] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');

  // --- NO CHANGE: Data fetching logic is preserved ---
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
        const [planResponse, completedResponse, userTopicsResponse] = await Promise.all([
            supabase.from('study_plans').select('plan_data').eq('user_id', user.id).single(),
            supabase.from('user_completed_topics').select('topic_name').eq('user_id', user.id),
            supabase.from('user_topics').select('topic_name, subject_name').eq('user_id', user.id)
        ]);
      
        const { data: planData, error: planError } = planResponse;
        const { data: completedData, error: completedError } = completedResponse;
        const { data: userTopicsData, error: userTopicsError } = userTopicsResponse;

        // Debug logging
        console.log('Plan response:', planResponse);
        console.log('User topics response:', userTopicsResponse);
        if (planError) console.error('Plan error:', planError);
        if (userTopicsError) console.error('User topics error:', userTopicsError);

      if (planData) {
        console.log('Raw plan data:', planData.plan_data); // Debug log
        
        // Handle plan data structure
        let planObject = {};
        
        if (planData.plan_data && typeof planData.plan_data === 'object') {
          // Plan data is an object with dates as keys
          Object.keys(planData.plan_data).forEach(date => {
            const dayData = planData.plan_data[date];
            if (dayData && dayData.topics && Array.isArray(dayData.topics)) {
              planObject[date] = dayData.topics.map(topic => ({
                topic: topic.topic || topic.name,
                subject: topic.subject,
                difficulty: topic.difficulty,
                estimated_hours: topic.estimated_hours,
                learningObjectives: topic.learningObjectives,
                category: topic.category,
                isCompleted: topic.isCompleted || false
              }));
            }
          });
        }
        
        console.log('Processed plan object:', planObject); // Debug log
        setPlan(planObject);

        if (completedData) {
          setCompletedTopics(new Set(completedData.map(item => item.topic_name)));
    }
  } else {
    // If no plan exists, create a basic plan from user topics
    if (userTopicsData && userTopicsData.length > 0) {
      console.log('No plan found, creating basic plan from user topics:', userTopicsData);
      
      // Group topics by subject
      const topicsBySubject = userTopicsData.reduce((acc, item) => {
        if (!acc[item.subject_name]) {
          acc[item.subject_name] = [];
        }
        acc[item.subject_name].push(item.topic_name);
        return acc;
      }, {});
      
      // Create a simple plan with all topics for today
      const today = new Date().toISOString().split('T')[0];
      const basicPlan = {};
      
      Object.keys(topicsBySubject).forEach(subject => {
        topicsBySubject[subject].forEach(topic => {
          if (!basicPlan[today]) {
            basicPlan[today] = [];
          }
          basicPlan[today].push({
            topic: topic,
            subject: subject,
            difficulty: 3,
            estimated_hours: 2,
            learningObjectives: [],
            category: 'Core',
            isCompleted: false
          });
        });
      });
      
      console.log('Created basic plan:', basicPlan);
      setPlan(basicPlan);
    } else {
      setPlan({}); // Use empty object instead of null to show "No plan found" message
    }
  }
    };

    fetchData();
  }, [user, navigate]);

  // Create fallback plan function
  const createFallbackPlan = async (examDate, userTopicsData) => {
    console.log('Creating fallback plan with exam date:', examDate);
    
    // Get exam date
    const examDateObj = new Date(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate days until exam
    const timeDiff = examDateObj.getTime() - today.getTime();
    const daysUntilExam = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysUntilExam <= 0) {
      throw new Error('Exam date has passed. Please update your exam date.');
    }
    
    // Create simple plan with all topics distributed across available days
    const simplePlan = {};
    const topics = userTopicsData.map(item => ({
      topic: item.topic_name,
      subject: item.subject_name,
      difficulty: 3,
      estimated_hours: 2,
      learningObjectives: [],
      category: 'Core',
      isCompleted: false
    }));
    
    // Distribute topics across days
    const topicsPerDay = Math.ceil(topics.length / daysUntilExam);
    let topicIndex = 0;
    
    for (let i = 0; i < daysUntilExam && topicIndex < topics.length; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      simplePlan[dateStr] = [];
      
      // Add topics for this day
      for (let j = 0; j < topicsPerDay && topicIndex < topics.length; j++) {
        simplePlan[dateStr].push(topics[topicIndex]);
        topicIndex++;
      }
    }
    
    console.log('Created fallback plan:', simplePlan);
    return simplePlan;
  };

  // Regenerate study plan function
  const handleRegeneratePlan = async () => {
    if (!user) {
      alert('No user found. Please log in.');
      return;
    }
    
    console.log('Starting plan regeneration for user:', user.id);
    
    try {
      // Get user's exam date and availability from study_plans
      console.log('Fetching exam date from study_plans...');
      const { data: planData, error: planError } = await supabase
        .from('study_plans')
        .select('exam_date')
        .eq('user_id', user.id)
        .single();
      
      console.log('Plan data response:', planData);
      console.log('Plan error:', planError);
      
      if (planError) {
        console.error('Error fetching exam date:', planError);
        alert(`Error fetching exam date: ${planError.message}`);
        return;
      }
      
      if (!planData) {
        alert('No exam date found. Please complete onboarding first.');
        return;
      }
      
      // Get user's topics
      console.log('Fetching user topics...');
      const { data: userTopicsData, error: userTopicsError } = await supabase
        .from('user_topics')
        .select('topic_name, subject_name')
        .eq('user_id', user.id);
      
      console.log('User topics response:', userTopicsData);
      console.log('User topics error:', userTopicsError);
      
      if (userTopicsError) {
        console.error('Error fetching user topics:', userTopicsError);
        alert(`Error fetching user topics: ${userTopicsError.message}`);
        return;
      }
      
      if (!userTopicsData || userTopicsData.length === 0) {
        alert('No topics found. Please complete onboarding first.');
        return;
      }
      
      // Group topics by subject
      console.log('Grouping topics by subject...');
      const subjects = userTopicsData.reduce((acc, item) => {
        let subject = acc.find(s => s.name === item.subject_name);
        if (!subject) {
          subject = { name: item.subject_name, topics: [] };
          acc.push(subject);
        }
        subject.topics.push({
          name: item.topic_name,
          difficulty: 3,
          estimatedHours: 2,
          learningObjectives: [],
          category: 'Core'
        });
        return acc;
      }, []);
      
      console.log('Grouped subjects:', subjects);
      
      // Create user profile (default values)
      const userProfile = {
        studyStyle: 'balanced',
        dailyCapacity: 4,
        preferredDifficulty: 'medium',
        learningGoals: 'exam_preparation'
      };
      
      // Test backend connection first
      console.log('Testing backend connection...');
      let backendAvailable = false;
      try {
        const testResponse = await fetch('http://localhost:3001/api/test');
        const testData = await testResponse.json();
        console.log('Backend test successful:', testData);
        backendAvailable = true;
      } catch (testError) {
        console.error('Backend test failed:', testError);
        console.log('Backend not available, will use fallback plan creation');
        backendAvailable = false;
      }
      
      let planToSave;
      
      if (backendAvailable) {
        console.log('Sending request to backend:', {
          subjects: subjects,
          examDate: planData.exam_date,
          availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          userProfile: userProfile
        });
        
        // Call backend to regenerate plan
        const response = await fetch('http://localhost:3001/api/generate-initial-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subjects: subjects,
            examDate: planData.exam_date,
            availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], // Default to all days
            userProfile: userProfile
          }),
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Backend error response:', errorText);
          throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Backend response:', result);
        planToSave = result.plan;
      } else {
        // Create fallback plan directly
        console.log('Creating fallback plan...');
        planToSave = await createFallbackPlan(planData.exam_date, userTopicsData);
      }
      
      // Update the study plan in database
      const { error: updateError } = await supabase
        .from('study_plans')
        .update({ plan_data: planToSave })
        .eq('user_id', user.id);
      
      if (updateError) {
        throw new Error('Failed to update plan in database');
      }
      
      // Refresh the page data
      window.location.reload();
      
    } catch (error) {
      console.error('Error regenerating plan:', error);
      alert(`Failed to regenerate plan: ${error.message}`);
    }
  };

  // --- NO CHANGE: Progress tracking logic is preserved ---
  const handleToggleComplete = async (topicStr) => {
    const topic = typeof topicStr === 'object' ? topicStr.topic : topicStr;
    if (!user) return;
    const newCompletedTopics = new Set(completedTopics);
    const isCompleted = newCompletedTopics.has(topic);
    let error;
    if (isCompleted) {
      newCompletedTopics.delete(topic);
      const { error: deleteError } = await supabase.from('user_completed_topics').delete().match({ user_id: user.id, topic_name: topic });
      error = deleteError;
    } else {
      newCompletedTopics.add(topic);
      const { error: insertError } = await supabase.from('user_completed_topics').insert({ user_id: user.id, topic_name: topic });
      error = insertError;
    }
    if (error) {
      console.error('Error updating topic completion:', error);
    } else {
      setCompletedTopics(newCompletedTopics);
    }
  };

  // --- NO CHANGE: Modal and navigation logic is preserved ---
  const handleQuizClick = (topicStr) => {
    const topic = typeof topicStr === 'object' ? topicStr.topic : topicStr;
    setSelectedTopic(topic);
    setIsModalOpen(true);
  };

  const handleDifficultySelect = (difficulty) => {
    setIsModalOpen(false);
    // UPDATED: Ensure navigation works with the new topic object structure
    navigate(`/quiz?topic=${encodeURIComponent(selectedTopic)}&difficulty=${difficulty}`);
  };

  if (!plan) {
    return <div className="flex text-white min-h-screen justify-center items-center">Loading Plan...</div>;
  }
  
  // UPDATED: Calculate total topics and completed topics for the progress bar
  const allTopics = Object.values(plan).flat();
  const totalTopicsCount = allTopics.length;
  const completedTopicsCount = allTopics.filter(topic => completedTopics.has(typeof topic === 'object' ? topic.topic : topic)).length;
  const progressPercentage = totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;


   return (
    <>
      <div className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 rounded-[2rem]">
        <motion.div
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={{ type: 'tween', ease: 'anticipate', duration: 0.5 }}
        >
          {/* Header Section */}
          <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-600/50 rounded-[2rem] p-6 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-500/20 rounded-[1rem]">
                <span className="text-3xl">📅</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Study Planner</h1>
                <p className="text-lg text-gray-400 mt-2">Your personalized learning roadmap to success</p>
              </div>
            </div>
            
            {/* Stats Grid */}
            {Object.keys(plan).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/30 p-4 rounded-[1rem] border border-gray-600/30">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <p className="text-2xl font-bold text-blue-400">{Object.keys(plan).length}</p>
                      <p className="text-sm text-gray-400">Study Days</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800/30 p-4 rounded-[1rem] border border-gray-600/30">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📚</span>
                    <div>
                      <p className="text-2xl font-bold text-green-400">{totalTopicsCount}</p>
                      <p className="text-sm text-gray-400">Total Topics</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800/30 p-4 rounded-[1rem] border border-gray-600/30">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏱️</span>
                    <div>
                      <p className="text-2xl font-bold text-purple-400">
                        {Object.values(plan).reduce((sum, day) => sum + day.reduce((daySum, topic) => daySum + (topic.estimated_hours || 2), 0), 0)}h
                      </p>
                      <p className="text-sm text-gray-400">Total Hours</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800/30 p-4 rounded-[1rem] border border-gray-600/30">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="text-2xl font-bold text-amber-400">{completedTopicsCount}</p>
                      <p className="text-sm text-gray-400">Completed</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-amber-400 flex items-center gap-2">
                  <span>🎯</span>
                  Overall Progress
                </span>
                <span className="text-sm font-bold text-white">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-700/50 rounded-full h-3">
                <motion.div 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button 
                onClick={handleRegeneratePlan}
                className="px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-300 font-semibold rounded-[1rem] transition-all flex items-center gap-2 hover:scale-105"
              >
                <FiZap size={18} />
                Regenerate Plan
              </button>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-600/50 rounded-[2rem] p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">🗓️</span>
              <h2 className="text-2xl font-bold text-white">Study Timeline</h2>
            </div>
            
            <div className="relative pl-8">
              {/* Timeline axis */}
              <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-600/50" />
              
              {Object.keys(plan).length > 0 ? (
                Object.entries(plan).map(([date, topics]) => {
                  const isToday = new Date(date).toDateString() === new Date().toDateString();
                  const topicsCount = topics.length;
                  return (
                    <motion.div key={date} variants={itemVariants} className="relative mb-8">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[39px] top-1 w-6 h-6 rounded-full border-4 ${isToday ? 'border-amber-400 bg-gray-900' : 'border-gray-600 bg-gray-800'}`}>
                        {isToday && <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-75" />}
                      </div>

                      <div className={`p-6 rounded-[1.5rem] bg-gray-800/30 backdrop-blur-sm border ${isToday ? 'border-amber-400/50' : 'border-gray-600/30'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                          <h3 className={`text-xl font-semibold ${isToday ? 'text-amber-400' : 'text-white'}`}>
                            {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 sm:mt-0 text-sm">
                            <span className="flex items-center gap-2 text-gray-400">
                              <FiBook size={14} /> {topicsCount} Topic{topicsCount !== 1 ? 's' : ''}
                            </span>
                            {topics.some(t => t.estimated_hours) && (
                              <span className="flex items-center gap-2 text-blue-400">
                                <FiClock size={14} /> {topics.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)}h
                              </span>
                            )}
                          </div>
                        </div>
                        <AnimatePresence>
                          <div className="space-y-3">
                            {topics.map((topic, index) => (
                              <TopicPill
                                key={typeof topic === 'object' ? topic.topic + index : topic + index}
                                topic={topic}
                                isCompleted={completedTopics.has(typeof topic === 'object' ? topic.topic : topic)}
                                onToggle={() => handleToggleComplete(topic)}
                                onQuiz={() => handleQuizClick(topic)}
                              />
                            ))}
                          </div>
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })
              ) : (
                <motion.div variants={itemVariants} className="text-center py-12">
                  <span className="text-6xl mb-4 block">📚</span>
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No Study Plan Found</h3>
                  <p className="text-gray-500 mb-6">Complete the onboarding process to create your personalized study plan.</p>
                  <button 
                    onClick={() => navigate('/onboarding')} 
                    className="px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-semibold rounded-[1rem] transition-all hover:scale-105"
                  >
                    Create Study Plan
                  </button>
                </motion.div>
              )}
            </div>
          </div>
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
                    <p className="text-sm text-gray-400 leading-relaxed">Perfect for reviewing fundamentals</p>
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
                    <p className="text-sm text-gray-400 leading-relaxed">Standard challenge level</p>
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
                    <p className="text-sm text-gray-400 leading-relaxed">Advanced mastery test</p>
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

export default StudyPlannerPage;