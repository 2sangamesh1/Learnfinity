import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiBookOpen, FiClock, FiTarget, FiCheckSquare, FiSquare, FiActivity, 
         FiPlus, FiTrash2, FiCheckCircle, FiZap, FiAward, FiLink } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import ReviewDashboard from '../components/ReviewDashboard';
import GamificationPanel from '../components/GamificationPanel';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';
import StudySessionTimer from '../components/StudySessionTimer';

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

// Bento Box Component
const BentoBox = ({ children, className = "" }) => (
  <motion.div
    variants={itemVariants}
    className={`bg-gray-800/40 backdrop-blur-sm border border-gray-600/50 rounded-[2rem] p-6 flex flex-col ${className}`}
  >
    {children}
  </motion.div>
);

// StatCard Component
const StatCard = ({ icon, label, value, color }) => (
  <div className={`bg-gray-800/30 p-4 rounded-2xl border border-gray-600/40 flex items-center gap-4 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl`}>
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm font-medium text-gray-400">{label}</p>
    </div>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    progress: 0, 
    topicsRemaining: 0, 
    daysLeft: 0, 
    subjects: [], 
    todaysTopics: [] 
  });
  const [userName, setUserName] = useState('');
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [allUserTopics, setAllUserTopics] = useState([]);
  const [todayCompletedSessions, setTodayCompletedSessions] = useState([]);
  const [dueReviews, setDueReviews] = useState([]);
  const [resources, setResources] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newResource, setNewResource] = useState({ subject: '', title: '', url: '' });
  const [recentScores, setRecentScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const startOfDay = new Date().setHours(0, 0, 0, 0);
        const endOfDay = new Date().setHours(23, 59, 59, 999);
        const today = format(new Date(), 'yyyy-MM-dd');

        const [
          profileData, 
          topicsData, 
          todosData, 
          sessionsData,
          resourcesData,
          planData,
          completedData,
          quizHistory
        ] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).single(),
          supabase.from('user_topics').select('*').eq('user_id', user.id),
          supabase.from('todos').select('*').eq('user_id', user.id),
          supabase.from('study_sessions').select('*, topic_id(topic_name)').eq('user_id', user.id).gte('created_at', new Date().toISOString().split('T')[0]),
          supabase.from('resources').select('id, subject, title, url').eq('user_id', user.id),
          supabase.from('study_plans').select('plan_data, exam_date').eq('user_id', user.id).single(),
          supabase.from('user_completed_topics').select('topic_name').eq('user_id', user.id),
          supabase.from('quiz_results').select('topic_name, score, quiz_timestamp').eq('user_id', user.id).order('quiz_timestamp', { ascending: false }).limit(5)
        ]);

        if (profileData.data) setUserName(profileData.data.full_name);
        if (topicsData.data) {
          setAllUserTopics(topicsData.data);
          const completedTopics = completedData.data ? completedData.data.map(t => t.topic_name) : [];
          const allTopics = topicsData.data.map(t => t.topic_name);
          const progress = allTopics.length > 0 ? Math.round((completedTopics.length / allTopics.length) * 100) : 0;
          
          // Calculate days left if we have exam date
          let daysLeft = 30; // default
          if (planData.data && planData.data.exam_date) {
            daysLeft = Math.ceil((new Date(planData.data.exam_date) - new Date()) / (1000 * 60 * 60 * 24));
          }
          
          setStats({ 
            progress, 
            topicsRemaining: allTopics.length - completedTopics.length, 
            daysLeft,
            subjects: [...new Set(topicsData.data.map(t => t.subject_name))],
            todaysTopics: planData.data?.plan_data?.[today] || []
          });
        }
        
        if (todosData.data) setTodos(todosData.data.map(todo => ({ id: todo.id, text: todo.task, completed: todo.is_completed })));
        if (sessionsData.data) setTodayCompletedSessions(sessionsData.data);
        if (quizHistory.data) setRecentScores(quizHistory.data.map(q => ({ id: q.quiz_timestamp, topic: q.topic_name, date: q.quiz_timestamp, percentage: q.score })));
        
        if (resourcesData.data) {
          const grouped = resourcesData.data.reduce((acc, r) => { 
            (acc[r.subject] = acc[r.subject] || []).push(r); 
            return acc; 
          }, {});
          setResources(grouped);
        }

        // Fetch reviews from AI scheduler if available
        try {
          const reviewsResponse = await fetch(`http://localhost:3001/api/spaced-repetition/reviews/${user.id}`);
          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json();
            setDueReviews(reviewsData);
          }
        } catch (error) {
          console.error("Error fetching reviews:", error);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, navigate]);

  const handleSessionComplete = (endedSession) => {
    const topic = allUserTopics.find(t => t.id === endedSession.topic_id);
    const newCompletedSession = { ...endedSession, topic_id: { topic_name: topic ? topic.topic_name : 'Unknown' } };
    setTodayCompletedSessions(prev => [newCompletedSession, ...prev]);
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim() || !user) return;
    const { data } = await supabase.from('todos').insert({ task: newTodo, user_id: user.id }).select().single();
    if (data) setTodos([...todos, { id: data.id, text: data.task, completed: data.is_completed }]);
    setNewTodo('');
  };

  const handleToggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const { data } = await supabase.from('todos').update({ is_completed: !todo.completed }).eq('id', id).select().single();
    if (data) setTodos(todos.map(t => (t.id === id ? { ...t, completed: data.is_completed } : t)));
  };

  const handleDeleteTodo = async (id) => {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (!error) setTodos(todos.filter(t => t.id !== id));
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!newResource.subject || !newResource.title || !newResource.url || !user) return;
    const { data, error } = await supabase.from('resources').insert({ user_id: user.id, ...newResource }).select().single();
    if (!error && data) {
      const updated = { ...resources };
      if (!updated[data.subject]) updated[data.subject] = [];
      updated[data.subject].push(data);
      setResources(updated);
      setNewResource({ subject: '', title: '', url: '' });
      setIsModalOpen(false);
    } else {
      console.error("Error adding resource:", error);
    }
  };

  const handleDeleteResource = async (id) => {
    let subject;
    for (const s in resources) {
      if (resources[s].find(r => r.id === id)) {
        subject = s;
        break;
      }
    }
    if (!subject) return;
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (!error) {
      const updated = { ...resources };
      updated[subject] = updated[subject].filter(r => r.id !== id);
      setResources(updated);
    } else {
      console.error("Error deleting resource:", error);
    }
  };

  const safeFormatTime = (value) => {
    try {
      return format(new Date(value), 'h:mm a');
    } catch {
      return 'N/A';
    }
  };

  const safeQuizDate = (value) => {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 rounded-[2rem]">
      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={containerVariants}
      >
        {/* Header */}
        <motion.h1 variants={itemVariants} className="text-4xl font-bold text-white mb-8">
          Welcome back, {userName || 'User'}!
        </motion.h1>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stats Overview */}
          <BentoBox className="lg:col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                icon={<FiTarget size={24} />} 
                label="Overall Progress" 
                value={`${stats.progress}%`} 
                color="bg-blue-500/10 text-blue-400"
              />
              <StatCard 
                icon={<FiBookOpen size={24} />} 
                label="Topics Remaining" 
                value={`${stats.topicsRemaining}`} 
                color="bg-amber-500/10 text-amber-400"
              />
              <StatCard 
                icon={<FiClock size={24} />} 
                label="Days Until Exam" 
                value={`${stats.daysLeft}`} 
                color="bg-red-500/10 text-red-400"
              />
            </div>
          </BentoBox>

          {/* Left Column - Study Tools */}
          <div className="lg:col-span-8 space-y-6">
            {/* Spaced Repetition Reviews */}
            <BentoBox>
              <ReviewDashboard userId={user?.id} />
            </BentoBox>

            {/* Study Timer */}
            <BentoBox>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FiClock className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Study Session</h2>
              </div>
              <StudySessionTimer topics={allUserTopics} onSessionEnd={handleSessionComplete} />
            </BentoBox>

            {/* Today's Plan & Tasks */}
            <BentoBox>
              <h2 className="text-2xl font-semibold text-amber-500 mb-4">Today's Plan & Tasks</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Scheduled Topics</h3>
                  {stats.todaysTopics.length > 0 ? (
                    <ul className="space-y-2">
                      {stats.todaysTopics.map((topic, index) => (
                        <li key={index} className="flex items-center bg-gray-900/70 p-3 rounded-lg">
                          <FiCheckSquare className="text-blue-400 mr-3 flex-shrink-0" /> 
                          <span className="text-gray-300">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm mt-4 italic">No topics scheduled for today.</p>
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Personal Tasks</h3>
                  <form onSubmit={handleAddTodo} className="flex gap-2 mb-3 flex-shrink-0">
                    <input 
                      type="text" 
                      value={newTodo} 
                      onChange={(e) => setNewTodo(e.target.value)} 
                      placeholder="Add a new task..." 
                      className="flex-grow p-2 bg-gray-900/70 border border-gray-700 rounded-md text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm" 
                    />
                    <button 
                      type="submit" 
                      className="bg-amber-500 text-gray-900 font-semibold p-2 rounded-md hover:bg-amber-600 transition-colors"
                    >
                      <FiPlus />
                    </button>
                  </form>
                  <ul className="space-y-2 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                    {todos.map(todo => (
                      <li key={todo.id} className="flex items-center justify-between bg-gray-900/70 p-2 rounded-lg">
                        <span className="flex items-center gap-3 cursor-pointer" onClick={() => handleToggleTodo(todo.id)}>
                          {todo.completed ? 
                            <FiCheckSquare className="text-green-500" /> : 
                            <FiSquare className="text-gray-500" />
                          }
                          <span className={`${todo.completed ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                            {todo.text}
                          </span>
                        </span>
                        <button onClick={() => handleDeleteTodo(todo.id)} className="text-gray-500 hover:text-red-500">
                          <FiTrash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </BentoBox>

            {/* Resource Hub */}
            <BentoBox>
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-2xl font-semibold text-amber-500">Resource Hub</h2>
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="flex items-center gap-2 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <FiPlus /> Add Resource
                </button>
              </div>
              {Object.keys(resources).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(resources).map(([subject, links]) => (
                    links.length > 0 && (
                      <div key={subject}>
                        <h3 className="font-bold text-lg text-gray-200 mb-2">{subject}</h3>
                        <ul className="space-y-2">
                          {links.map((link) => (
                            <li key={link.id} className="flex justify-between items-center bg-gray-900/70 p-3 rounded-lg">
                              <a 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-3 text-gray-300 hover:text-amber-500 transition-colors"
                              >
                                <FiLink /> {link.title}
                              </a>
                              <button 
                                onClick={() => handleDeleteResource(link.id)} 
                                className="text-gray-500 hover:text-red-500 p-1 rounded-full"
                              >
                                <FiTrash2 />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic">No resources saved yet. Click 'Add Resource' to get started.</p>
              )}
            </BentoBox>
          </div>

          {/* Right Column - Progress & Activity */}
          <div className="lg:col-span-4 space-y-6">
            {/* Gamification Panel */}
            <BentoBox>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FiAward className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">Your Progress</h2>
              </div>
              <GamificationPanel userId={user?.id} />
            </BentoBox>

            {/* Recent Activity */}
            <BentoBox>
              <h2 className="text-xl font-semibold text-amber-500 mb-4 flex items-center gap-2 flex-shrink-0">
                <FiActivity /> Recent Activity
              </h2>
              {recentScores.length > 0 ? (
                <ul className="space-y-3 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                  {recentScores.map(q => (
                    <li key={q.id} className="flex items-center justify-between p-2.5 bg-gray-900/70 rounded-lg">
                      <div>
                        <p className="font-semibold text-white truncate max-w-[120px]">{q.topic}</p>
                        <p className="text-xs text-gray-400">{safeQuizDate(q.date)}</p>
                      </div>
                      <div className={`font-bold text-md ${
                        q.percentage >= 80 ? 'text-green-400' : 
                        q.percentage >= 60 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {q.percentage}%
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm h-full flex items-center justify-center italic">No recent quiz scores.</p>
              )}
            </BentoBox>

            {/* Completed Today */}
            <BentoBox>
              <h2 className="text-xl font-semibold text-green-500 mb-4 flex items-center gap-2 flex-shrink-0">
                <FiCheckCircle /> Completed Today
              </h2>
              {todayCompletedSessions.length > 0 ? (
                <div className="space-y-3 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                  {todayCompletedSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-gray-900/70 p-2.5 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-md text-neutral-200">{s.topic_id?.topic_name || 'Unknown'}</span>
                        <span className="text-xs text-neutral-400">Actual: {s.actual_duration} min</span>
                      </div>
                      <span className="text-xs text-neutral-500">{safeFormatTime(s.end_time)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-400 text-sm italic">No sessions completed yet.</p>
              )}
            </BentoBox>
          </div>
        </div>

        {/* Add Resource Modal */}
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
                initial={{ scale: 0.9 }} 
                animate={{ scale: 1 }} 
                exit={{ scale: 0.9 }} 
                onClick={(e) => e.stopPropagation()} 
                className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg text-left space-y-4"
              >
                <h3 className="text-2xl font-bold text-white">Add a New Resource</h3>
                <form onSubmit={handleAddResource} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                    <select 
                      onChange={(e) => setNewResource({ ...newResource, subject: e.target.value })} 
                      value={newResource.subject} 
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="" disabled>Select a subject</option>
                      {stats.subjects?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                    <input 
                      type="text" 
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })} 
                      value={newResource.title} 
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500" 
                      placeholder="e.g., Big O Notation Video" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
                    <input 
                      type="url" 
                      onChange={(e) => setNewResource({ ...newResource, url: e.target.value })} 
                      value={newResource.url} 
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500" 
                      placeholder="https://example.com" 
                    />
                  </div>
                  <div className="flex justify-end gap-4 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="py-2 px-6 font-semibold rounded-md text-gray-200 bg-gray-600 hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="py-2 px-6 font-semibold rounded-md text-gray-900 bg-amber-500 hover:bg-amber-600 transition-colors"
                    >
                      Save Resource
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DashboardPage;