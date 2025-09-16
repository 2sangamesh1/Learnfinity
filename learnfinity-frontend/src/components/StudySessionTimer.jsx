import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlay, FiPause, FiStopCircle, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
// Study session service moved to backend

// Animation variants for smooth state changes
const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } },
};

const StudySessionTimer = ({ topics, onSessionEnd }) => {
  // --- YOUR ORIGINAL STATE AND LOGIC --- (Completely Unchanged)
  const { user } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [plannedDuration, setPlannedDuration] = useState(25);
  const [status, setStatus] = useState("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [interruptions, setInterruptions] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const timerRef = useRef(null);

  // --- YOUR ORIGINAL FUNCTIONS --- (Completely Unchanged)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (status === "in-progress") {
      timerRef.current = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [status]);

  const handleStart = async () => { 
    if (!user || !selectedTopic) return; 
    try { 
      const startTime = new Date().toISOString(); 
      const response = await fetch('http://localhost:3001/api/study-session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          topicId: selectedTopic.id,
          plannedDuration: plannedDuration,
          startTime: startTime
        })
      });
      
      if (!response.ok) throw new Error('Failed to start session');
      const session = await response.json();
      
      setSessionId(session.id); 
      setElapsedSeconds(0); 
      setInterruptions(0); 
      setStatus("in-progress"); 
    } catch (error) { 
      console.error("Failed to start session:", error); 
      alert("Could not start session. Check console for details."); 
    } 
  };
  const handlePause = async () => { 
    if (!sessionId) return; 
    try { 
      const response = await fetch('http://localhost:3001/api/study-session/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          interruptionsCount: interruptions + 1
        })
      });
      
      if (!response.ok) throw new Error('Failed to pause session');
      
      setStatus("paused"); 
      setInterruptions((prev) => prev + 1); 
    } catch (error) { 
      console.error("Failed to pause session:", error); 
      alert("Could not pause session. Check console for details."); 
    } 
  };
  const handleResume = async () => { 
    if (!sessionId) return; 
    try { 
      const response = await fetch('http://localhost:3001/api/study-session/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId
        })
      });
      
      if (!response.ok) throw new Error('Failed to resume session');
      
      setStatus("in-progress"); 
    } catch (error) { 
      console.error("Failed to resume session:", error); 
      alert("Could not resume session. Check console for details."); 
    } 
  };
  const handleEnd = async () => {
    if (!sessionId) return;
    clearInterval(timerRef.current);
    timerRef.current = null;
    try {
      const endTime = new Date().toISOString();
      const response = await fetch('http://localhost:3001/api/study-session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          actualDurationSeconds: elapsedSeconds,
          endTime: endTime
        })
      });
      
      if (!response.ok) throw new Error('Failed to end session');
      
      setStatus("completed");
      const endedSession = { id: sessionId, topic_id: selectedTopic.id, actual_duration: Math.round(elapsedSeconds / 60), planned_duration: plannedDuration, start_time: new Date( new Date().getTime() - elapsedSeconds * 1000 ).toISOString(), end_time: endTime, status: "completed", interruptions, };
      if (onSessionEnd) { onSessionEnd(endedSession); }
    } catch (error) { console.error("Failed to end session:", error); alert("Could not end session. Check console for details."); }
  };
  
  // ADDED: A reset handler to be called from the completed state
  const handleReset = () => {
      setSessionId(null);
      setElapsedSeconds(0);
      setInterruptions(0);
      setSelectedTopic(null);
      setStatus("idle");
  };

  return (
    // UPDATED: This is the core of the layout fix. 
    // It makes the component a flex container that fills the height of its parent bento box.
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        
        {/* --- IDLE STATE --- */}
        {status === "idle" && (
          <motion.div key="idle" variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col h-full">
            <h2 className="text-2xl font-bold text-amber-400 mb-6 text-center flex-shrink-0">Focus Session</h2>
            
            {/* UPDATED: This middle section now grows to fill available space */}
            <div className="flex-grow flex flex-col justify-center space-y-6">
              <div>
                <label className="block text-gray-300 mb-1">Select Topic</label>
                <select className="w-full p-3 bg-gray-700/80 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500" value={selectedTopic ? selectedTopic.id : ""} onChange={(e) => { const topic = topics.find((t) => t.id === Number(e.target.value)); setSelectedTopic(topic); }}>
                  <option value="" disabled>Select a topic</option>
                  {topics.map((topic) => (<option key={topic.id} value={topic.id}>{topic.topic_name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Planned Duration (minutes)</label>
                <input type="number" min="1" className="w-full p-3 bg-gray-700/80 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500" value={plannedDuration} onChange={(e) => setPlannedDuration(Number(e.target.value))} />
              </div>
            </div>
            
            {/* UPDATED: This bottom section no longer has extra margin */}
            <div className="mt-6 flex-shrink-0">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleStart} disabled={!selectedTopic} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-5 rounded-lg font-semibold shadow-lg shadow-green-600/20 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all">
                    <FiPlay /> Start Session
                </motion.button>
            </div>
          </motion.div>
        )}

        {/* --- ACTIVE & PAUSED STATE --- */}
        {(status === "in-progress" || status === "paused") && (
          <motion.div key="active" variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center justify-center h-full">
            <p className="text-amber-400 font-semibold mb-2 flex-shrink-0">{selectedTopic?.topic_name}</p>
            <div className="flex-grow flex flex-col items-center justify-center">
                <div className="text-8xl font-mono text-white text-center my-4">{formatTime(elapsedSeconds)}</div>
                <p className="text-gray-400">Interruptions: {interruptions}</p>
            </div>
            <div className="flex justify-center gap-4 mt-4 flex-shrink-0">
              {status === "in-progress" ? (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handlePause} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 py-3 px-8 rounded-lg font-semibold shadow-md"><FiPause /> Pause</motion.button>
              ) : (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleResume} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-gray-900 py-3 px-8 rounded-lg font-semibold shadow-md"><FiPlay /> Resume</motion.button>
              )}
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleEnd} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-8 rounded-lg font-semibold shadow-md"><FiStopCircle /> End</motion.button>
            </div>
          </motion.div>
        )}

        {/* --- COMPLETED STATE --- */}
         {status === "completed" && (
          <motion.div key="completed" variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center text-center justify-center h-full">
              <div className="w-16 h-16 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mb-6">
                  <FiCheckCircle size={32} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Session Complete!</h2>
              <p className="text-gray-400 mb-8">Great work on <span className="text-amber-400 font-semibold">{selectedTopic?.topic_name}</span>.</p>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleReset} className="mt-4 w-full max-w-xs bg-gray-700 text-white font-bold py-3 px-6 rounded-full text-lg hover:bg-gray-600 transition-colors">
                  Start Another Session
              </motion.button>
          </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default StudySessionTimer;