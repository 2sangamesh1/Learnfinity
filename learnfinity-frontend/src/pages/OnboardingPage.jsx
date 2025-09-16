// src/pages/OnboardingPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';

// --- NEW IMPORTS ---
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
// ADDED: Icons for the new AI parsing feature
import { FiZap, FiLoader } from 'react-icons/fi';


// --- NO CHANGE TO THIS HELPER FUNCTION ---
const generateStudyPlan = (topicsStr, examDate, availability) => {
    const topics = topicsStr.split(',').map(t => t.trim()).filter(t => t);
    const plan = {};
    if (topics.length === 0 || !examDate) return plan;
    const startDate = new Date();
    const endDate = new Date(examDate);
    let availableDays = 0;
    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const availableWeekdays = availability.map(day => dayMap[day]);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (availableWeekdays.includes(d.getDay())) {
            availableDays++;
        }
    }
    if (availableDays === 0) availableDays = 1;
    const topicsPerDay = Math.ceil(topics.length / availableDays);
    let topicIndex = 0;
    for (let d = new Date(startDate); d <= endDate && topicIndex < topics.length; d.setDate(d.getDate() + 1)) {
        if (availableWeekdays.includes(d.getDay())) {
            const dateKey = d.toISOString().split('T')[0];
            plan[dateKey] = [];
            for (let i = 0; i < topicsPerDay && topicIndex < topics.length; i++) {
                plan[dateKey].push(topics[topicIndex]);
                topicIndex++;
            }
        }
    }
    return plan;
};

const OnboardingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // Get the current user

    const [step, setStep] = useState(1);
    const totalSteps = 6; // Increased to accommodate new subject management

    const [name, setName] = useState('');
    const [subjects, setSubjects] = useState([]); // Changed to array for multiple subjects
    const [currentSubject, setCurrentSubject] = useState({ name: '', topics: [] });
    const [examDate, setExamDate] = useState(undefined);
    const [availability, setAvailability] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ENHANCED: State for the AI parsing modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rawSyllabusText, setRawSyllabusText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [modalError, setModalError] = useState('');
    const [parsedData, setParsedData] = useState(null);

    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const handleAvailabilityChange = (day) => {
        setAvailability(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    // ENHANCED: Handler function to call the enhanced syllabus parsing API
    const handleParseSyllabus = async () => {
        if (!rawSyllabusText.trim()) {
            setModalError("Syllabus can't be empty.");
            return;
        }
        setIsParsing(true);
        setModalError('');
        try {
            const response = await fetch('http://localhost:3001/api/parse-syllabus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    syllabusText: rawSyllabusText,
                    subjectName: currentSubject.name || 'General'
                })
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to parse syllabus.');
            }
            const data = await response.json();
            setParsedData(data);
            // Don't close modal yet - let user review the parsed data
        } catch (err) {
            setModalError(err.message);
        } finally {
            setIsParsing(false);
        }
    };

    // ENHANCED: Handler to add parsed topics to current subject
    const handleAddParsedTopics = () => {
        if (parsedData && parsedData.topics) {
            setCurrentSubject(prev => ({
                ...prev,
                topics: [...prev.topics, ...parsedData.topics]
            }));
            setParsedData(null);
            setRawSyllabusText('');
            setIsModalOpen(false);
        }
    };

    // ENHANCED: Handler to add current subject to subjects list
    const handleAddSubject = () => {
        if (currentSubject.name.trim() && currentSubject.topics.length > 0) {
            setSubjects(prev => [...prev, { ...currentSubject }]);
            setCurrentSubject({ name: '', topics: [] });
        }
    };

    // ENHANCED: Handler to remove a subject
    const handleRemoveSubject = (index) => {
        setSubjects(prev => prev.filter((_, i) => i !== index));
    };

    // --- THIS IS THE MAIN CHANGE: THE SUBMIT HANDLER ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError("You must be logged in to create a plan.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            // 1. Generate the intelligent study plan using enhanced backend
            const planResponse = await fetch('http://localhost:3001/api/generate-initial-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subjects: subjects,
                    examDate: examDate,
                    availability: availability,
                    userProfile: {
                        learningStyle: 'reading', // Default, will be updated later
                        attentionSpan: 60,
                        studyTimePreference: 'afternoon'
                    }
                })
            });
            
            if (!planResponse.ok) throw new Error('Failed to generate intelligent study plan');
            const planData = await planResponse.json();
            const studyPlanObject = planData.plan;

            // 2. Update the user's name in their profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name: name })
                .eq('id', user.id);
            if (profileError) throw profileError;

            // 3. Prepare and insert all topics into the 'user_topics' table
            const topicsToInsert = [];
            subjects.forEach(subject => {
                subject.topics.forEach(topic => {
                    topicsToInsert.push({
                        user_id: user.id,
                        topic_name: topic.name,
                        subject_name: subject.name
                        // Only include basic fields that exist in your current schema
                        // Add these fields later when you update your database schema:
                        // difficulty: topic.difficulty,
                        // estimated_hours: topic.estimatedHours,
                        // learning_objectives: topic.learningObjectives,
                        // category: topic.category
                    });
                });
            });
            
            if (topicsToInsert.length > 0) {
                const { error: topicsError } = await supabase
                    .from('user_topics')
                    .insert(topicsToInsert);
                if (topicsError) throw topicsError;
            }

            // 4. Insert the generated plan into the 'study_plans' table
            const formattedExamDate = format(examDate, 'yyyy-MM-dd');
            const { error: planError } = await supabase
                .from('study_plans')
                .insert({
                    user_id: user.id,
                    plan_data: studyPlanObject,
                    exam_date: formattedExamDate
                    // Add these fields later when you update your database schema:
                    // total_study_hours: planData.totalStudyHours,
                    // estimated_weeks: planData.estimatedWeeks,
                    // study_intensity: planData.studyIntensity
                });
            if (planError) throw planError;
            
            // 5. Success! Navigate to the dashboard
            navigate('/dashboard');

        } catch (error) {
            setError(error.message);
            console.error("Error saving onboarding data:", error);
        } finally {
            setLoading(false);
        }
    };

    const variants = {
        enter: { opacity: 0, y: 15 },
        center: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -15 },
    };

    return (
        <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-xl">
                <p className="text-center text-sm font-semibold text-neutral-400 mb-2">STEP {step} OF {totalSteps}</p>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-8">
                    <motion.div
                        className="bg-yellow-400 h-1.5 rounded-full"
                        animate={{ width: `${(step / totalSteps) * 100}%` }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                    />
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="w-full max-w-xl p-8 space-y-6 bg-slate-900 rounded-xl shadow-2xl border border-slate-800"
                    >
                        {step === 1 && (
                            <div>
                                <h2 className="text-3xl font-bold text-center text-neutral-100">Welcome! What's your name?</h2>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="w-full p-3 mt-6 bg-slate-800 border border-slate-700 rounded-md text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="e.g., Alex Doe" />
                                <button type="button" onClick={nextStep} disabled={!name} className="w-full mt-6 py-3 px-4 font-semibold rounded-md text-slate-900 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
                            </div>
                        )}
                        {step === 2 && (
                            <div>
                                <h2 className="text-3xl font-bold text-center text-neutral-100">Add Your Subjects</h2>
                                <p className="text-center text-neutral-400 mt-2">Add subjects and their topics. You can add multiple subjects.</p>
                                
                                {/* Current Subject Input */}
                                <div className="mt-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-300 mb-2">Subject Name</label>
                                        <input 
                                            type="text" 
                                            value={currentSubject.name} 
                                            onChange={(e) => setCurrentSubject(prev => ({ ...prev, name: e.target.value }))} 
                                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-500" 
                                            placeholder="e.g., Data Structures" 
                                        />
                                    </div>
                                    
                                    {/* Topics Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-300 mb-2">Topics (comma-separated)</label>
                                        <textarea 
                                            value={currentSubject.topics.map(t => t.name).join(', ')} 
                                            onChange={(e) => {
                                                const topicNames = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                                const topics = topicNames.map(name => ({ name, difficulty: 3, estimatedHours: 2 }));
                                                setCurrentSubject(prev => ({ ...prev, topics }));
                                            }}
                                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-md text-neutral-200 h-24 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-500" 
                                            placeholder="e.g., Arrays, Linked Lists, Trees, Graphs"
                                        />
                                    </div>
                                    
                                    {/* Add Subject Button */}
                                    <button 
                                        type="button" 
                                        onClick={handleAddSubject}
                                        disabled={!currentSubject.name.trim() || currentSubject.topics.length === 0}
                                        className="w-full py-3 px-4 font-semibold rounded-md text-slate-900 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Add Subject
                                    </button>
                                </div>
                                
                                {/* Added Subjects Display */}
                                {subjects.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-lg font-semibold text-neutral-200 mb-3">Added Subjects:</h3>
                                        <div className="space-y-2">
                                            {subjects.map((subject, index) => (
                                                <div key={index} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                                                    <div>
                                                        <span className="font-semibold text-neutral-100">{subject.name}</span>
                                                        <span className="text-sm text-neutral-400 ml-2">({subject.topics.length} topics)</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveSubject(index)}
                                                        className="text-red-400 hover:text-red-300"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex justify-between mt-6">
                                    <button type="button" onClick={prevStep} className="py-3 px-6 font-semibold rounded-md text-neutral-200 bg-slate-700 hover:bg-slate-600 transition-colors">Back</button>
                                    <button type="button" onClick={nextStep} disabled={subjects.length === 0} className="py-3 px-6 font-semibold rounded-md text-slate-900 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 transition-colors">Next</button>
                                </div>
                            </div>
                        )}
                        {/* ENHANCED: Step 3 - Review and confirm subjects */}
                        {step === 3 && (
                            <div>
                                <h2 className="text-3xl font-bold text-center text-neutral-100">Review Your Subjects</h2>
                                <p className="text-center text-neutral-400 mt-2">Review your subjects and topics before proceeding.</p>
                                
                                {subjects.length > 0 ? (
                                    <div className="mt-6 space-y-4">
                                        {subjects.map((subject, index) => (
                                            <div key={index} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                                <h3 className="text-lg font-semibold text-neutral-100 mb-2">{subject.name}</h3>
                                                <div className="text-sm text-neutral-400 mb-2">
                                                    {subject.topics.length} topics • {subject.topics.reduce((sum, topic) => sum + (topic.estimatedHours || 2), 0)} hours estimated
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {subject.topics.slice(0, 5).map((topic, topicIndex) => (
                                                        <span key={topicIndex} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                                                            {topic.name}
                                                        </span>
                                                    ))}
                                                    {subject.topics.length > 5 && (
                                                        <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                                                            +{subject.topics.length - 5} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-6 text-center text-neutral-400">
                                        <p>No subjects added yet. Please go back and add subjects.</p>
                                    </div>
                                )}
                                
                                <div className="flex justify-between mt-6">
                                    <button type="button" onClick={prevStep} className="py-3 px-6 font-semibold rounded-md text-neutral-200 bg-slate-700 hover:bg-slate-600 transition-colors">Back</button>
                                    <button type="button" onClick={nextStep} disabled={subjects.length === 0} className="py-3 px-6 font-semibold rounded-md text-slate-900 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 transition-colors">Next</button>
                                </div>
                            </div>
                        )}
                        {step === 4 && (
                            <div>
                                <h2 className="text-3xl font-bold text-center text-neutral-100">Add Topics with AI (Optional)</h2>
                                <p className="text-center text-neutral-400 mt-2">Use our AI to parse syllabus text and extract topics automatically.</p>
                                
                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold rounded-md text-slate-900 bg-sky-400 hover:bg-sky-500 transition-colors"
                                    >
                                        <FiZap size={16} />
                                        Parse Syllabus with AI
                                    </button>
                                </div>
                                
                                <div className="flex justify-between mt-6">
                                    <button type="button" onClick={prevStep} className="py-3 px-6 font-semibold rounded-md text-neutral-200 bg-slate-700 hover:bg-slate-600 transition-colors">Back</button>
                                    <button type="button" onClick={nextStep} className="py-3 px-6 font-semibold rounded-md text-slate-900 bg-yellow-400 hover:bg-yellow-500 transition-colors">Skip</button>
                                </div>
                            </div>
                        )}
                        {step === 5 && (
                            <div>
                                <h2 className="text-3xl font-bold text-center text-neutral-100">Select your exam date</h2>
                                <div className="flex justify-center mt-6">
                                    <DayPicker mode="single" selected={examDate} onSelect={setExamDate} disabled={{ before: new Date() }} classNames={{ root: 'bg-slate-800 p-4 rounded-lg border border-slate-700', caption: 'flex justify-between items-center mb-4', caption_label: 'text-lg font-bold text-neutral-100', nav_button: 'h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-700', head: 'text-neutral-400 font-semibold', cell: 'w-10 h-10', day: 'w-10 h-10 rounded-full text-neutral-200 hover:bg-slate-700 flex items-center justify-center', day_today: 'text-yellow-400 font-bold', day_selected: '!bg-yellow-500 !text-slate-900', day_disabled: 'text-neutral-600' }} />
                                </div>
                                <div className="flex justify-between mt-6">
                                    <button type="button" onClick={prevStep} className="py-3 px-6 font-semibold rounded-md text-neutral-200 bg-slate-700 hover:bg-slate-600 transition-colors">Back</button>
                                    <button type="button" onClick={nextStep} disabled={!examDate} className="py-3 px-6 font-semibold rounded-md text-slate-900 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 transition-colors">Next</button>
                                </div>
                            </div>
                        )}
                        {step === 6 && (
                            <div>
                                <h2 className="text-3xl font-bold text-center text-neutral-100">What's your weekly availability?</h2>
                                {error && <p className="text-center text-sm text-red-400 mt-4">{error}</p>}
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mt-6">
                                    {weekDays.map(day => (
                                        <button type="button" key={day} onClick={() => handleAvailabilityChange(day)} className={`p-4 rounded-md font-semibold transition-colors ${availability.includes(day) ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-neutral-200 border border-slate-700 hover:bg-slate-600'}`}>
                                            {day}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-6">
                                    <button type="button" onClick={prevStep} className="py-3 px-6 font-semibold rounded-md text-neutral-200 bg-slate-700 hover:bg-slate-600 transition-colors">Back</button>
                                    <button type="button" onClick={handleSubmit} disabled={availability.length === 0 || loading} className="py-3 px-6 font-semibold rounded-md text-slate-900 bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-colors">
                                        {loading ? 'Generating...' : 'Generate Plan'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
            
            {/* ENHANCED: AI Parser Modal with Parsed Data Preview */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-4xl p-8 space-y-6 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto"
                        >
                            <h3 className="text-2xl font-bold text-neutral-100">Parse Syllabus with AI</h3>
                            <p className="text-neutral-400">Paste your syllabus below and our AI will extract topics with dependencies and difficulty levels.</p>
                            
                            {!parsedData ? (
                                <>
                                    <textarea
                                        value={rawSyllabusText}
                                        onChange={(e) => setRawSyllabusText(e.target.value)}
                                        className="w-full p-3 mt-6 bg-slate-800 border border-slate-700 rounded-md text-neutral-200 h-40 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        placeholder="Paste your messy syllabus text here..."
                                    />
                                    
                                    {modalError && <p className="text-red-400 text-sm">{modalError}</p>}
                                    
                                    <div className="flex justify-end gap-4">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="py-2 px-6 font-semibold rounded-md text-neutral-200 bg-slate-700 hover:bg-slate-600 transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleParseSyllabus}
                                            disabled={isParsing}
                                            className="py-2 px-6 flex items-center justify-center gap-2 font-semibold rounded-md text-slate-900 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 transition-colors"
                                        >
                                            {isParsing ? <><FiLoader className="animate-spin" /> Parsing...</> : 'Parse'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Parsed Data Preview */}
                                    <div className="space-y-4">
                                        <div className="bg-slate-800 p-4 rounded-lg">
                                            <h4 className="text-lg font-semibold text-neutral-100 mb-2">Subject Overview</h4>
                                            <p className="text-neutral-300">{parsedData.subjectOverview}</p>
                                            <div className="mt-2 flex gap-4 text-sm text-neutral-400">
                                                <span>Total Hours: {parsedData.totalEstimatedHours}</span>
                                                <span>Topics: {parsedData.topics.length}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-800 p-4 rounded-lg">
                                            <h4 className="text-lg font-semibold text-neutral-100 mb-3">Recommended Learning Sequence</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {parsedData.recommendedSequence.map((topic, index) => (
                                                    <span key={index} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                                                        {index + 1}. {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-800 p-4 rounded-lg">
                                            <h4 className="text-lg font-semibold text-neutral-100 mb-3">Topics with Details</h4>
                                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                                {parsedData.topics.map((topic, index) => (
                                                    <div key={index} className="border border-slate-700 p-3 rounded-lg">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h5 className="font-semibold text-neutral-100">{topic.name}</h5>
                                                            <div className="flex gap-2 text-sm">
                                                                <span className={`px-2 py-1 rounded ${
                                                                    topic.difficulty <= 2 ? 'bg-green-500/20 text-green-400' :
                                                                    topic.difficulty <= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                                                                    'bg-red-500/20 text-red-400'
                                                                }`}>
                                                                    Difficulty: {topic.difficulty}/5
                                                                </span>
                                                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                                                    {topic.estimatedHours}h
                                                                </span>
                                                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                                                                    {topic.category}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {topic.dependencies.length > 0 && (
                                                            <p className="text-sm text-neutral-400 mb-2">
                                                                Depends on: {topic.dependencies.join(', ')}
                                                            </p>
                                                        )}
                                                        <div className="text-sm text-neutral-300">
                                                            <strong>Objectives:</strong> {topic.learningObjectives.join(', ')}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-4">
                                        <button type="button" onClick={() => { setParsedData(null); setRawSyllabusText(''); }} className="py-2 px-6 font-semibold rounded-md text-neutral-200 bg-slate-700 hover:bg-slate-600 transition-colors">
                                            Parse Another
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleAddParsedTopics}
                                            className="py-2 px-6 font-semibold rounded-md text-slate-900 bg-green-500 hover:bg-green-600 transition-colors"
                                        >
                                            Add These Topics
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OnboardingPage;