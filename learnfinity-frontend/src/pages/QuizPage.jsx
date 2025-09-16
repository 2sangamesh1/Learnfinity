// src/pages/QuizPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiHelpCircle, FiArrowRight, FiLoader, FiLogOut } from 'react-icons/fi';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const QuizPage = () => {
    const { topic, difficulty } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [userAnswers, setUserAnswers] = useState([]);
    const [showResult, setShowResult] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);
    const [explanationToShow, setExplanationToShow] = useState({ question: '', explanation: '' });
    const [isExplanationLoading, setIsExplanationLoading] = useState(false);

    useEffect(() => {
        const fetchQuizData = async () => {
            setIsLoading(true);
            try {
                // Use Node.js backend for quiz generation
                const response = await fetch('http://localhost:3001/api/generate-quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        topic: decodeURIComponent(topic), 
                        difficulty
                    })
                });
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                
                setQuestions(data.questions);

            } catch (error) {
                console.error("Failed to fetch quiz questions:", error);
                setQuestions([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuizData();
    }, [topic, difficulty]);

    useEffect(() => {
        const saveResult = async () => {
            if (showResult && questions.length > 0 && user) {
                const score = userAnswers.filter(ans => ans.chosenAnswer === ans.question.correctAnswer).length;
                const percentage = Math.round((score / questions.length) * 100);
                
                try {
                    // Save quiz result to Supabase
                    await supabase.from('quiz_results').insert({
                        user_id: user.id,
                        topic_name: decodeURIComponent(topic),
                        score: percentage,
                        difficulty: difficulty,
                        quiz_timestamp: new Date().toISOString()
                    });

                    // Update spaced repetition data via Node.js backend
                    await fetch('http://localhost:3001/api/spaced-repetition/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.id,
                            topicName: decodeURIComponent(topic),
                            performanceScore: percentage,
                            difficulty: difficulty
                        })
                    });
                } catch (error) {
                    console.error('Error saving quiz result:', error);
                }
            }
        };
        saveResult();
    }, [showResult, questions, userAnswers, topic, user, difficulty]);

    const handleNextQuestion = () => {
        setUserAnswers([...userAnswers, { question: questions[currentQuestionIndex], chosenAnswer: selectedAnswer }]);
        setSelectedAnswer(null);
        if (currentQuestionIndex + 1 < questions.length) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            setShowResult(true);
        }
    };

    const handleShowExplanation = async (item) => {
        setExplanationToShow({ question: item.question.question, explanation: '' });
        setIsExplanationModalOpen(true);
        setIsExplanationLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/generateExplanation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: item.question.question,
                    options: item.question.options,
                    answer: item.question.correctAnswer
                }),
            });
            if (!response.ok) { throw new Error('Failed to fetch explanation.'); }
            const data = await response.json();
            setExplanationToShow(prevState => ({ ...prevState, explanation: data.explanation }));
        } catch (error) {
            console.error("Explanation error:", error);
            setExplanationToShow(prevState => ({ ...prevState, explanation: 'Sorry, an error occurred.' }));
        } finally {
            setIsExplanationLoading(false);
        }
    };
    
    if (isLoading) { return <div className="min-h-screen flex flex-col items-center justify-center text-white"><FiLoader className="animate-spin text-4xl text-yellow-400" /><p className="mt-4 text-lg">Generating your AI-powered quiz...</p></div>; }
    if (!questions || (questions.length === 0 && !isLoading)) { return ( <div className="min-h-screen flex items-center justify-center p-4"><motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl p-8 space-y-6 bg-slate-900 rounded-xl shadow-lg border border-slate-800 text-center"><h2 className="text-3xl font-bold text-neutral-100">AI Quiz Generation Failed</h2><p className="text-lg text-neutral-400">Sorry, we couldn't generate a '{difficulty}' quiz for "{decodeURIComponent(topic)}". Please try again.</p><button onClick={() => navigate('/planner')} className="mt-6 bg-yellow-400 text-slate-900 font-semibold py-3 px-8 rounded-lg text-lg hover:bg-yellow-500 transition-all duration-300 shadow-lg">Back to Planner</button></motion.div></div> ); }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    if (showResult) {
        const score = userAnswers.filter(ans => ans.chosenAnswer === ans.question.correctAnswer).length;
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-start justify-center overflow-y-auto">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto w-full text-center bg-slate-900 p-8 my-16 rounded-2xl border border-slate-800 shadow-2xl">
                    <h2 className="text-4xl font-bold text-neutral-100">Quiz Completed!</h2>
                    <p className="text-6xl font-bold text-yellow-400 my-6">{Math.round((score / questions.length) * 100)}%</p>
                    <p className="text-lg text-neutral-300">You answered {score} out of {questions.length} questions correctly.</p>

                    <div className="mt-10 space-y-6">
                        {userAnswers.map((item, index) => {
                            const isCorrect = item.chosenAnswer === item.question.correctAnswer;
                            return (
                                <div key={index} className={`p-4 rounded-lg border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'} bg-slate-800 text-left`}>
                                    <h3 className="text-md font-semibold text-neutral-100">{index + 1}. {item.question.question}</h3>
                                    <p className={`text-sm mt-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>Your Answer: {item.chosenAnswer} {isCorrect ? <FiCheck className="inline"/> : <FiX className="inline"/>}</p>
                                    {!isCorrect && <p className="text-sm mt-1 text-green-400">Correct Answer: {item.question.correctAnswer}</p>}
                                    
                                    <button onClick={() => handleShowExplanation(item)} className="mt-3 text-xs flex items-center gap-1 text-sky-400 hover:underline">
                                        <FiHelpCircle size={14}/> 
                                        {isCorrect ? 'Review Explanation' : 'Get AI Explanation'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="mt-10 flex flex-wrap justify-center items-center gap-4">
                        <Link to="/dashboard"><button className="bg-transparent border-2 border-slate-600 text-neutral-300 font-semibold py-3 px-6 rounded-lg text-md hover:bg-slate-800 hover:border-slate-500 transition-all">Go to Dashboard</button></Link>
                        <Link to="/planner"><button className="bg-yellow-400 text-slate-900 font-bold py-3 px-6 rounded-lg text-md hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-500/20">Take Another Quiz</button></Link>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {isExplanationModalOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4" onClick={() => setIsExplanationModalOpen(false)}>
                            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} onClick={(e) => e.stopPropagation()} className="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-full max-w-2xl text-left">
                                <p className="text-sm font-semibold text-neutral-400 mb-2">AI Tutor Explanation for:</p>
                                <h3 className="text-xl font-bold mb-4 text-yellow-400">{explanationToShow.question}</h3>
                                <div className="mt-4 min-h-[100px]">
                                    {isExplanationLoading ? (<div className="flex items-center gap-3 text-neutral-400"><FiLoader className="animate-spin" /><span>Our AI Tutor is thinking...</span></div>) : (<p className="text-neutral-200 text-md whitespace-pre-wrap">{explanationToShow.explanation}</p>)}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-3xl relative">
                <div className="absolute top-0 left-0 -translate-y-full mb-4 sm:mb-0 sm:-translate-y-0 sm:-translate-x-full sm:pr-8">
                    <button 
                        onClick={() => navigate('/planner')} 
                        className="flex items-center gap-2 text-neutral-400 hover:text-red-400 transition-colors py-2 px-4 rounded-lg bg-slate-900/50 hover:bg-slate-800"
                    >
                        <FiLogOut /> Quit
                    </button>
                </div>

                <div className="mb-8">
                    <p className="text-center text-yellow-400 font-semibold mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                        <motion.div className="bg-yellow-400 h-2 rounded-full" animate={{ width: `${progress}%` }} />
                    </div>
                </div>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestionIndex}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800"
                    >
                        <h2 className="text-2xl md:text-3xl font-semibold text-neutral-100 mb-6">{currentQuestion?.question}</h2>
                        <div className="space-y-4">
                            {currentQuestion?.options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedAnswer(option)}
                                    className={`w-full p-4 text-left rounded-lg text-lg transition-all border-2 ${selectedAnswer === option ? 'border-yellow-400 bg-yellow-400/10 scale-105' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}
                                >
                                    <span className={`mr-4 font-bold ${selectedAnswer === option ? 'text-yellow-400' : 'text-neutral-500'}`}>{String.fromCharCode(65 + index)}</span>
                                    <span className={`${selectedAnswer === option ? 'text-neutral-100' : 'text-neutral-300'}`}>{option}</span>
                                </button>
                            ))}
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button onClick={handleNextQuestion} disabled={!selectedAnswer} className="flex items-center gap-2 bg-yellow-400 text-slate-900 font-bold py-3 px-8 rounded-lg text-lg hover:bg-yellow-500 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                Next <FiArrowRight />
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default QuizPage;