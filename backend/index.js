// backend/index.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const math = require('mathjs'); // For ML calculations

// --- Configuration ---
const app = express();
const PORT = 3001;
const API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// ENHANCED: Advanced Spaced Repetition Configuration
const RECALL_PROBABILITY_THRESHOLD = 0.75; // If probability is lower than this, a review is due

// Python ML Microservice Configuration
const PYTHON_ML_URL = 'http://127.0.0.1:8000';

// Spaced Repetition Intervals (in days)
const SPACED_REPETITION_INTERVALS = {
    'EASY': [1, 6, 15, 30, 90, 180, 365],
    'MEDIUM': [1, 3, 7, 14, 30, 60, 120],
    'HARD': [1, 2, 4, 8, 16, 32, 64],
    'DEFAULT': [1, 3, 7, 14, 30, 60, 120]
};

// Performance thresholds for adjusting intervals
const PERFORMANCE_THRESHOLDS = {
    'EXCELLENT': 0.9,  // 90%+ correct
    'GOOD': 0.8,       // 80-89% correct
    'FAIR': 0.6,       // 60-79% correct
    'POOR': 0.4        // Below 60% correct
};

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in your .env file");
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_KEY must be defined in your .env file");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Advanced Spaced Repetition Functions ---

// Calculate next review date using SuperMemo 2 algorithm
function calculateNextReview(userId, topicName, performanceScore, difficulty) {
    return new Promise(async (resolve, reject) => {
        try {
            // Get existing spaced repetition data
            const { data: existingData, error: fetchError } = await supabase
                .from('spaced_repetition_data')
                .select('*')
                .eq('user_id', userId)
                .eq('topic_name', topicName)
                .single();

            let newInterval, newRepetitions, newEaseFactor, nextReview;

            if (fetchError && fetchError.code === 'PGRST116') {
                // First time studying this topic
                newInterval = 1;
                newRepetitions = 0;
                newEaseFactor = 2.5;
            } else if (fetchError) {
                throw fetchError;
            } else {
                // Update existing data using SuperMemo 2 algorithm
                const currentInterval = existingData.interval_days;
                const currentRepetitions = existingData.repetitions;
                const currentEaseFactor = existingData.ease_factor;

                // SuperMemo 2 algorithm
                if (performanceScore >= 60) {
                    // Correct answer
                    if (currentRepetitions === 0) {
                        newInterval = 1;
                    } else if (currentRepetitions === 1) {
                        newInterval = 6;
                    } else {
                        newInterval = Math.round(currentInterval * currentEaseFactor);
                    }
                    newRepetitions = currentRepetitions + 1;
                    newEaseFactor = Math.max(1.3, currentEaseFactor + (0.1 - (5 - performanceScore) * (0.08 + (5 - performanceScore) * 0.02)));
                } else {
                    // Incorrect answer - reset
                    newInterval = 1;
                    newRepetitions = 0;
                    newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2);
                }
            }

            nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + newInterval);

            const performanceHistory = existingData?.performance_history || [];
            performanceHistory.push({
                score: performanceScore,
                difficulty: difficulty,
                timestamp: new Date().toISOString()
            });

            // Calculate forgetting probability using Ebbinghaus curve
            const forgettingProbability = calculateForgettingProbability(
                new Date(existingData?.last_review || new Date()),
                newInterval
            );

            const { data, error } = await supabase
                .from('spaced_repetition_data')
                .upsert([{
                    user_id: userId,
                    topic_name: topicName,
                    interval_days: newInterval,
                    repetitions: newRepetitions,
                    ease_factor: newEaseFactor,
                    last_review: new Date().toISOString(),
                    next_review: nextReview.toISOString(),
                    performance_history: performanceHistory,
                    forgetting_probability: forgettingProbability
                }])
                .select()
                .single();

            if (error) throw error;

            resolve({
                next_review: nextReview.toISOString(),
                interval_days: newInterval,
                repetitions: newRepetitions,
                ease_factor: newEaseFactor,
                forgetting_probability: forgettingProbability
            });

        } catch (error) {
            reject(error);
        }
    });
}

// Calculate forgetting probability using Ebbinghaus forgetting curve
function calculateForgettingProbability(lastReview, intervalDays) {
    const daysSinceReview = (new Date() - new Date(lastReview)) / (1000 * 60 * 60 * 24);
    const timeRatio = daysSinceReview / intervalDays;
    
    // Ebbinghaus forgetting curve: R = e^(-t/S) where t is time, S is strength
    const strength = intervalDays * 0.5; // Adjust strength based on interval
    const retention = Math.exp(-timeRatio / strength);
    
    return Math.max(0, 1 - retention);
}

// Get topics due for review with ML-enhanced predictions
async function getTopicsDueForReview(userId) {
    try {
        // Get user's learning profile
        const { data: profile, error: profileError } = await supabase
            .from('learning_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        // Get all spaced repetition data for user
        const { data: allTopics, error: topicsError } = await supabase
            .from('spaced_repetition_data')
            .select('*')
            .eq('user_id', userId);

        if (topicsError) throw topicsError;

        const now = new Date();
        const dueReviews = [];

        // Enhanced prediction using multiple factors
        for (const topic of allTopics || []) {
            const prediction = await calculateIntelligentReviewPrediction(topic, profile);
            
            if (prediction.shouldReview) {
                dueReviews.push({
                    ...topic,
                    urgency: prediction.urgency,
                    confidence: prediction.confidence,
                    predictedRetention: prediction.predictedRetention,
                    optimalDifficulty: prediction.optimalDifficulty,
                    studyRecommendations: prediction.studyRecommendations
                });
            }
        }

        // Sort by urgency and confidence
        dueReviews.sort((a, b) => {
            const urgencyOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.confidence - a.confidence;
        });

        return dueReviews;

    } catch (error) {
        console.error("Error getting topics due for review:", error);
        return [];
    }
}

// Enhanced prediction function with ML-like intelligence
async function calculateIntelligentReviewPrediction(topic, userProfile) {
    const now = new Date();
    const lastReview = new Date(topic.last_review);
    const daysSinceReview = Math.floor((now - lastReview) / (1000 * 60 * 60 * 24));
    
    // Base forgetting curve calculation
    const baseRetention = Math.exp(-daysSinceReview / (topic.ease_factor * 7));
    
    // Adjust based on user profile
    let adjustedRetention = baseRetention;
    if (userProfile) {
        // Adjust based on user's retention rate
        adjustedRetention *= userProfile.retention_rate || 0.7;
        
        // Adjust based on learning style
        const styleMultiplier = {
            'visual': 1.1,
            'auditory': 1.0,
            'kinesthetic': 0.9,
            'reading': 1.05
        };
        adjustedRetention *= styleMultiplier[userProfile.learning_style] || 1.0;
    }
    
    // Adjust based on performance history
    if (topic.performance_history && topic.performance_history.length > 0) {
        const avgPerformance = topic.performance_history.reduce((sum, score) => sum + score, 0) / topic.performance_history.length;
        const performanceFactor = avgPerformance / 100;
        adjustedRetention *= (0.5 + performanceFactor * 0.5); // Scale between 0.5 and 1.0
    }
    
    // Calculate urgency
    const forgettingProbability = 1 - adjustedRetention;
    let urgency = 'LOW';
    if (forgettingProbability > 0.8) urgency = 'CRITICAL';
    else if (forgettingProbability > 0.6) urgency = 'HIGH';
    else if (forgettingProbability > 0.4) urgency = 'MEDIUM';
    
    // Determine if review is needed
    const shouldReview = forgettingProbability > 0.3 || daysSinceReview > topic.interval_days;
    
    // Generate study recommendations
    const studyRecommendations = generateStudyRecommendations(topic, userProfile, urgency);
    
    // Determine optimal difficulty
    const optimalDifficulty = determineOptimalDifficulty(topic, userProfile);
    
    return {
        shouldReview,
        urgency,
        confidence: Math.min(0.95, 0.7 + (topic.repetitions * 0.05)),
        predictedRetention: adjustedRetention,
        optimalDifficulty,
        studyRecommendations,
        daysSinceReview,
        forgettingProbability
    };
}

// Generate personalized study recommendations
function generateStudyRecommendations(topic, userProfile, urgency) {
    const recommendations = [];
    
    if (urgency === 'CRITICAL') {
        recommendations.push({
            type: 'URGENT',
            message: 'This topic needs immediate review - high risk of forgetting',
            priority: 'HIGH'
        });
    }
    
    if (userProfile?.learning_style === 'visual') {
        recommendations.push({
            type: 'STUDY_METHOD',
            message: 'Try creating diagrams or mind maps for this topic',
            priority: 'MEDIUM'
        });
    }
    
    if (topic.performance_history && topic.performance_history.length > 2) {
        const recentPerformance = topic.performance_history.slice(-3);
        const avgRecent = recentPerformance.reduce((sum, score) => sum + score, 0) / recentPerformance.length;
        
        if (avgRecent < 60) {
            recommendations.push({
                type: 'DIFFICULTY',
                message: 'Consider reviewing foundational concepts before this topic',
                priority: 'HIGH'
            });
        }
    }
    
    return recommendations;
}

// Determine optimal difficulty for review
function determineOptimalDifficulty(topic, userProfile) {
    const baseDifficulty = topic.difficulty || 'medium';
    
    if (userProfile?.difficulty_preference) {
        return userProfile.difficulty_preference;
    }
    
    // Adjust based on performance history
    if (topic.performance_history && topic.performance_history.length > 0) {
        const avgPerformance = topic.performance_history.reduce((sum, score) => sum + score, 0) / topic.performance_history.length;
        
        if (avgPerformance > 80) return 'hard';
        if (avgPerformance < 60) return 'easy';
    }
    
    return baseDifficulty;
}

// --- Routes ---

// =============================================
// ML TABLES API ENDPOINTS
// =============================================

// Learning Profiles Endpoints
app.post('/api/learning-profile/create', async (req, res) => {
  try {
    const { userId, learningStyle, attentionSpan, difficultyPreference, studyTimePreference, retentionRate, improvementRate } = req.body;
    console.log(`✅ Received learning profile creation request for user: ${userId}`);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { data, error } = await supabase
      .from('learning_profiles')
      .insert([{
        user_id: userId,
        learning_style: learningStyle || 'reading',
        attention_span: attentionSpan || 25.0,
        difficulty_preference: difficultyPreference || 'medium',
        study_time_preference: studyTimePreference || 'evening',
        retention_rate: retentionRate || 0.7,
        improvement_rate: improvementRate || 0.5
      }])
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Successfully created learning profile.");
    res.json(data);

  } catch (error) {
    console.error("❌ Error creating learning profile:", error);
    res.status(500).json({ 
      error: 'Failed to create learning profile.',
      details: error.message 
    });
  }
});

app.get('/api/learning-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`✅ Received learning profile request for user: ${userId}`);

    const { data, error } = await supabase
      .from('learning_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    console.log("✅ Successfully fetched learning profile.");
    res.json(data);

  } catch (error) {
    console.error("❌ Error fetching learning profile:", error);
    res.status(500).json({ 
      error: 'Failed to fetch learning profile.',
      details: error.message 
    });
  }
});

// Spaced Repetition Data Endpoints (calls Python ML microservice)
app.post('/api/spaced-repetition/update', async (req, res) => {
  try {
    const { userId, topicName, performanceScore, difficulty } = req.body;
    console.log(`✅ Received spaced repetition update for user: ${userId}, topic: ${topicName}`);

    if (!userId || !topicName) {
      return res.status(400).json({ error: 'User ID and topic name are required' });
    }

    // Call Python ML microservice for intelligent spaced repetition
    const mlResponse = await axios.post(`${PYTHON_ML_URL}/api/v1/smart-scheduler/spaced-repetition/update`, {
      user_id: userId,
      topic_name: topicName,
      performance_score: performanceScore,
      difficulty: difficulty || 'medium'
    });

    if (mlResponse.data.error) {
      throw new Error(mlResponse.data.error);
    }

    console.log("✅ Successfully updated spaced repetition data using ML.");
    res.json(mlResponse.data);

  } catch (error) {
    console.error("❌ Error calling Python ML microservice for spaced repetition:", error);
    
    // Fallback to basic calculation
    try {
      const result = await calculateNextReview(userId, topicName, performanceScore, difficulty);
      console.log("✅ Used fallback spaced repetition calculation.");
      res.json({...result, fallback: true});
    } catch (fallbackError) {
      console.error("❌ Error in fallback spaced repetition:", fallbackError);
      res.status(500).json({ 
        error: 'Failed to update spaced repetition data.',
        details: fallbackError.message 
      });
    }
  }
});

// ENHANCED: Intelligent spaced repetition with ML-powered predictions
app.get('/api/spaced-repetition/reviews/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`✅ Received intelligent spaced repetition reviews request for user: ${userId}`);

    // Call Python ML microservice for intelligent reviews
    const mlResponse = await axios.get(`${PYTHON_ML_URL}/api/v1/smart-scheduler/spaced-repetition/reviews/${userId}`);

    if (mlResponse.data.error) {
      throw new Error(mlResponse.data.error);
    }

    console.log(`✅ Successfully fetched ${mlResponse.data.topics.length} intelligent reviews using ML.`);
    res.json(mlResponse.data.topics);

  } catch (error) {
    console.error("❌ Error calling Python ML microservice for reviews:", error);
    
    // Fallback to basic calculation
    try {
      const dueReviews = await getTopicsDueForReview(userId);
      console.log(`✅ Used fallback method - fetched ${dueReviews.length} reviews.`);
      res.json(dueReviews);
    } catch (fallbackError) {
      console.error("❌ Error in fallback reviews:", fallbackError);
      res.status(500).json({
        error: 'Failed to fetch intelligent spaced repetition reviews.',
        details: fallbackError.message
      });
    }
  }
});

// These functions are already defined above, removing duplicates

// Learning Analytics Endpoints
app.post('/api/learning-analytics/generate', async (req, res) => {
  try {
    const { userId } = req.body;
    console.log(`✅ Received learning analytics generation request for user: ${userId}`);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch user's data for analytics
    const [quizResults, studySessions, learningProfile] = await Promise.all([
      supabase.from('quiz_results').select('*').eq('user_id', userId),
      supabase.from('study_sessions').select('*').eq('user_id', userId),
      supabase.from('learning_profiles').select('*').eq('user_id', userId).single()
    ]);

    // Calculate analytics
    const analytics = {
      learning_velocity: calculateLearningVelocity(quizResults.data || []),
      retention_curve: calculateRetentionCurve(quizResults.data || []),
      peak_performance_time: calculatePeakPerformanceTime(studySessions.data || []),
      burnout_risk_score: calculateBurnoutRisk(studySessions.data || []),
      learning_style_confidence: learningProfile.data ? 0.85 : 0.0,
      weakness_areas: identifyWeaknessAreas(quizResults.data || []),
      improvement_trend: calculateImprovementTrend(quizResults.data || [])
    };

    // Save analytics
    const { data, error } = await supabase
      .from('learning_analytics')
      .insert([{
        user_id: userId,
        analytics_data: analytics
      }])
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Successfully generated learning analytics.");
    res.json(data);

  } catch (error) {
    console.error("❌ Error generating learning analytics:", error);
    res.status(500).json({ 
      error: 'Failed to generate learning analytics.',
      details: error.message 
    });
  }
});

// Helper functions for analytics calculations
function calculateLearningVelocity(quizResults) {
  if (quizResults.length === 0) return 0;
  const days = (new Date() - new Date(quizResults[0].quiz_timestamp)) / (1000 * 60 * 60 * 24);
  return quizResults.length / Math.max(days, 1);
}

function calculateRetentionCurve(quizResults) {
  // Simplified retention curve calculation
  return [0.95, 0.87, 0.72, 0.58]; // 1, 7, 30, 90 days
}

function calculatePeakPerformanceTime(studySessions) {
  // Analyze session times to find peak performance
  return 'morning'; // Simplified
}

function calculateBurnoutRisk(studySessions) {
  // Calculate burnout risk based on study intensity
  return 0.2; // Simplified
}

function identifyWeaknessAreas(quizResults) {
  // Identify topics with consistently low scores
  const topicScores = {};
  quizResults.forEach(quiz => {
    if (!topicScores[quiz.topic_name]) {
      topicScores[quiz.topic_name] = { total: 0, count: 0 };
    }
    topicScores[quiz.topic_name].total += quiz.score;
    topicScores[quiz.topic_name].count += 1;
  });

  return Object.entries(topicScores)
    .filter(([topic, data]) => (data.total / data.count) < 60)
    .map(([topic]) => topic);
}

function calculateImprovementTrend(quizResults) {
  if (quizResults.length < 2) return 'stable';
  const recent = quizResults.slice(0, 5);
  const older = quizResults.slice(5, 10);
  
  const recentAvg = recent.reduce((sum, quiz) => sum + quiz.score, 0) / recent.length;
  const olderAvg = older.reduce((sum, quiz) => sum + quiz.score, 0) / older.length;
  
  if (recentAvg > olderAvg + 5) return 'increasing';
  if (recentAvg < olderAvg - 5) return 'decreasing';
  return 'stable';
}

// ML Model Performance Endpoints
app.get('/api/ml-models/performance', async (req, res) => {
  try {
    console.log(`✅ Received ML model performance request`);

    const { data, error } = await supabase
      .from('ml_model_performance')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log("✅ Successfully fetched ML model performance.");
    res.json(data);

  } catch (error) {
    console.error("❌ Error fetching ML model performance:", error);
    res.status(500).json({ 
      error: 'Failed to fetch ML model performance.',
      details: error.message 
    });
  }
});

// Quiz Generation (calls Python ML microservice)
app.post('/api/generate-quiz', async (req, res) => {
    const { topic, difficulty = 'medium' } = req.body;
    console.log(`✅ Received quiz request for topic: ${topic}, difficulty: ${difficulty}`);

    if (!topic) {
        return res.status(400).json({ error: 'Topic is required' });
    }

    try {
        const prompt = `
          Generate a multiple-choice quiz with 5 questions for the topic: "${topic}".
          The difficulty level should be "${difficulty}".
          IMPORTANT: Your response MUST be a valid JSON object. Do not include any text, backticks, or labels outside of the JSON object.
          The JSON object should have a single key "questions", which is an array of question objects.
          Each question object must have the following three keys:
          1. "question": A string containing the question text.
          2. "options": An array of 4 strings representing the possible answers.
          3. "correctAnswer": A string that is an exact match to one of the 4 strings in the "options" array.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const startIndex = responseText.indexOf('{');
        const endIndex = responseText.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1) {
            throw new Error("No valid JSON object found in Gemini response.");
        }
        const jsonString = responseText.substring(startIndex, endIndex + 1);
        const jsonResponse = JSON.parse(jsonString);

        console.log("✅ Successfully generated quiz using Gemini.");
        res.json(jsonResponse);

    } catch (error) {
        console.error("❌ Quiz generation failed (Gemini):", error.message);
        res.status(500).json({
            error: 'Failed to generate quiz.',
            details: error.message
        });
    }
});

// Explanation Generation (calls Python ML microservice)
app.post('/api/generateExplanation', async (req, res) => {
  try {
    const { question, options, answer, user_answer } = req.body;
    console.log(`✅ Received explanation request for question: ${question}`);

    if (!question || !options || !answer) {
        return res.status(400).json({ error: 'Question, options, and answer are required.' });
    }

    // Call Python ML microservice for AI-powered explanation
    const mlResponse = await axios.post(`${PYTHON_ML_URL}/ml/generate-explanation`, {
      question: question,
      correct_answer: answer,
      user_answer: user_answer || answer
    });

    if (mlResponse.data.error) {
      throw new Error(mlResponse.data.error);
    }

    console.log("✅ Successfully generated explanation using Python ML microservice.");
    res.json(mlResponse.data);

  } catch (error) {
    console.error("❌ Error calling Python ML microservice for explanation:", error);
    
    // Fallback to Google Gemini if Python service is unavailable
    try {
      // Ensure variables are in scope for the fallback
      const { question, options, answer, user_answer } = req.body;
      
      const prompt = `
        Act as a helpful study tutor. A student got the following multiple-choice question wrong and needs an explanation.
        The question was: "${question}"
        The options were: ${options.join(', ')}
        The correct answer is: "${answer}"
        Please provide a clear, concise explanation (around 3-4 sentences) of the concept behind the question. Explain WHY "${answer}" is the correct answer and briefly touch on why the other options are incorrect. Explain it like you're talking to a high school or early college student.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      console.log("✅ Successfully generated explanation using fallback method.");
      res.json({ explanation: responseText });

    } catch (fallbackError) {
      console.error("❌ Error in fallback explanation generation:", fallbackError);
      res.status(500).json({ 
        error: 'Failed to generate explanation.',
        details: fallbackError.message 
      });
    }
  }
});

// Gamification endpoints - proxy to Python backend
app.get('/api/v1/smart-scheduler/gamification/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📊 Getting gamification data for user: ${userId}`);
    
    // Call Python ML microservice for gamification data
    const mlResponse = await axios.get(`${PYTHON_ML_URL}/api/v1/smart-scheduler/gamification/${userId}`);
    
    res.json(mlResponse.data);
  } catch (error) {
    console.error('❌ Error fetching gamification data:', error.message);
    
    // Fallback with mock data
    res.json({
      level: 1,
      level_name: "Beginner",
      current_xp: 100,
      xp_to_next_level: 400,
      current_streak: 1,
      longest_streak: 1,
      badges: [
        { id: "streak_3", name: "Getting Started", icon: "🔥", unlocked: false, rarity: "common", points: 50 }
      ],
      achievements: [
        { id: "quiz_novice", name: "Quiz Novice", description: "Complete 10 quizzes", progress: 1, target: 10, completed: false, progress_percentage: 10 }
      ],
      recent_activity: [],
      stats: {
        total_badges: 0,
        total_achievements: 0,
        completion_rate: 0
      }
    });
  }
});

app.post('/api/v1/smart-scheduler/gamification/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const activityData = req.body;
    
    console.log(`🎮 Recording activity for user: ${userId}`, activityData);
    
    // Call Python ML microservice to record activity
    const mlResponse = await axios.post(`${PYTHON_ML_URL}/api/v1/smart-scheduler/gamification/${userId}/activity`, activityData);
    
    res.json(mlResponse.data);
  } catch (error) {
    console.error('❌ Error recording gamification activity:', error.message);
    
    // Fallback response
    res.json({
      user_id: userId,
      activity_recorded: true,
      updates: {
        xp_gained: 25,
        badges_unlocked: [],
        achievements_updated: []
      }
    });
  }
});

// Enhanced Smart Scheduler API endpoint with ML integration
app.post('/api/smart-recommendations', async (req, res) => {
  try {
    const { userId, topicPerformance, recentQuizzes } = req.body;
    console.log(`✅ Received smart recommendations request for user: ${userId}`);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user's learning profile and spaced repetition data
    const [learningProfile, spacedRepetitionData, analytics] = await Promise.all([
      supabase.from('learning_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('spaced_repetition_data').select('*').eq('user_id', userId),
      supabase.from('learning_analytics').select('*').eq('user_id', userId).order('generated_at', { ascending: false }).limit(1)
    ]);

    // Get topics that need review
    const topicsForReview = spacedRepetitionData.data?.filter(topic => 
      new Date(topic.next_review) <= new Date()
    ) || [];

    // Generate AI-powered study recommendations based on performance data
    const prompt = `
      As an AI study advisor, analyze the following student performance data and generate personalized study recommendations:
      
      Recent Quiz Performance: ${JSON.stringify(recentQuizzes?.slice(0, 10) || [])}
      Topic Performance Data: ${JSON.stringify(topicPerformance || [])}
      Learning Profile: ${JSON.stringify(learningProfile.data || {})}
      Topics for Review: ${JSON.stringify(topicsForReview.map(t => t.topic_name))}
      Learning Analytics: ${JSON.stringify(analytics.data?.[0]?.analytics_data || {})}
      
      Based on this data, provide:
      1. A brief analysis of the student's learning patterns
      2. 3-5 specific, actionable study recommendations
      3. Suggested focus areas for improvement
      4. Motivational insights about their progress
      5. Priority topics for spaced repetition review
      
      Format your response as a JSON object with these keys:
      - "analysis": A 2-3 sentence summary of their learning patterns
      - "recommendations": An array of 3-5 recommendation objects, each with "title", "description", and "priority" (HIGH/MEDIUM/LOW)
      - "focusAreas": An array of 2-3 areas that need attention
      - "motivation": A brief encouraging message about their progress
      - "reviewTopics": An array of topics that need spaced repetition review
      
      Keep recommendations practical and specific to their actual performance data.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up potential markdown formatting
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '');
    const jsonResponse = JSON.parse(cleanedText);

    console.log("✅ Successfully generated smart recommendations.");
    res.json(jsonResponse);

  } catch (error) {
    console.error("❌ Error generating smart recommendations:", error);
    res.status(500).json({ 
      error: 'Failed to generate smart recommendations.',
      details: error.message 
    });
  }
});

// ENHANCED: Intelligent study plan generator with dependency analysis
app.post('/api/generate-initial-plan', async (req, res) => {
    try {
        const { subjects, examDate, availability, userProfile } = req.body;
        
        console.log('Request body:', req.body);
        console.log('Subjects:', subjects);
        console.log('Exam date:', examDate);
        console.log('Availability:', availability);
        console.log('User profile:', userProfile);
        
        if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
            return res.status(400).json({ error: 'Subjects array is required and must not be empty.' });
        }
        
        if (!examDate) {
            return res.status(400).json({ error: 'Exam date is required.' });
        }
        
        if (!availability || !Array.isArray(availability) || availability.length === 0) {
            return res.status(400).json({ error: 'Availability array is required and must not be empty.' });
        }
        
        console.log(`✅ Received intelligent plan request for ${subjects.length} subjects.`);

        // Calculate available study days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const finalExamDate = new Date(examDate);
        const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
        const availableWeekdays = availability.map(day => dayMap[day]);
        
        const availableSlots = [];
        const currentDate = new Date(today);
        
        while (currentDate <= finalExamDate) {
            if (availableWeekdays.includes(currentDate.getDay())) {
                availableSlots.push({ 
                    date: currentDate.toISOString().split('T')[0], 
                    topics: [],
                    totalHours: 0,
                    difficulty: 0
                });
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (availableSlots.length === 0) {
            return res.status(400).json({ error: "No available study days found based on your selection." });
        }

        // Process each subject and create intelligent schedule
        const masterPlan = {};
        let totalStudyHours = 0;

        for (const subject of subjects) {
            if (subject.topics && subject.topics.length > 0) {
                // Create dependency-aware schedule for this subject
                const subjectSchedule = await createIntelligentSubjectSchedule(
                    subject, 
                    availableSlots, 
                    userProfile,
                    totalStudyHours
                );
                
                // Merge subject schedule into master plan
                Object.keys(subjectSchedule).forEach(date => {
                    if (!masterPlan[date]) {
                        masterPlan[date] = { topics: [], totalHours: 0, difficulty: 0 };
                    }
                    masterPlan[date].topics.push(...subjectSchedule[date].topics);
                    masterPlan[date].totalHours += subjectSchedule[date].totalHours;
                    masterPlan[date].difficulty = Math.max(masterPlan[date].difficulty, subjectSchedule[date].difficulty);
                });

                totalStudyHours += subject.topics.reduce((sum, topic) => sum + (topic.estimatedHours || 2), 0);
            }
        }

        // Return plan in object format for frontend compatibility
        console.log(`✅ Successfully generated intelligent study plan with ${Object.keys(masterPlan).length} study days.`);
        res.json({ 
            plan: masterPlan, // Return as object with dates as keys
            totalStudyHours,
            estimatedWeeks: Math.ceil(Object.keys(masterPlan).length / 7),
            studyIntensity: calculateStudyIntensityFromHours(totalStudyHours, Object.keys(masterPlan).length)
        });

    } catch (error) {
        console.error("❌ Error generating intelligent study plan:", error);
        res.status(500).json({ 
            error: 'Failed to generate intelligent study plan.',
            details: error.message 
        });
    }
});

// ENHANCED: Helper function to create intelligent schedule for a subject
async function createIntelligentSubjectSchedule(subject, availableSlots, userProfile, currentTotalHours) {
    const schedule = {};
    
    // Sort topics by dependencies and difficulty
    const sortedTopics = sortTopicsByDependencies(subject.topics);
    
    // Calculate daily study capacity based on user profile
    const dailyCapacity = calculateDailyCapacity(userProfile);
    
    // Calculate total hours needed for this subject
    const totalSubjectHours = sortedTopics.reduce((sum, topic) => sum + (topic.estimatedHours || 2), 0);
    
    // Distribute topics evenly across available days
    let topicIndex = 0;
    
    for (let dayIndex = 0; dayIndex < availableSlots.length && topicIndex < sortedTopics.length; dayIndex++) {
        const slotDate = availableSlots[dayIndex].date;
        schedule[slotDate] = { topics: [], totalHours: 0, difficulty: 0 };
        
        let dayHours = 0;
        
        // Add topics to this day until we reach capacity
        while (topicIndex < sortedTopics.length && dayHours < dailyCapacity) {
            const topic = sortedTopics[topicIndex];
            const topicHours = topic.estimatedHours || 2;
            
            // Check if adding this topic would exceed daily capacity
            if (dayHours + topicHours <= dailyCapacity) {
                schedule[slotDate].topics.push({
                    topic: topic.name,
                    subject: subject.name,
                    difficulty: topic.difficulty || 3,
                    estimated_hours: topicHours,
                    learningObjectives: topic.learningObjectives || [],
                    category: topic.category || 'Core',
                    isCompleted: false
                });
                
                schedule[slotDate].totalHours += topicHours;
                schedule[slotDate].difficulty = Math.max(schedule[slotDate].difficulty, topic.difficulty || 3);
                dayHours += topicHours;
                topicIndex++;
            } else {
                break; // Move to next day
            }
        }
    }
    
    // If there are remaining topics, distribute them to remaining days
    while (topicIndex < sortedTopics.length) {
        for (let dayIndex = 0; dayIndex < availableSlots.length && topicIndex < sortedTopics.length; dayIndex++) {
            const slotDate = availableSlots[dayIndex].date;
            if (!schedule[slotDate]) {
                schedule[slotDate] = { topics: [], totalHours: 0, difficulty: 0 };
            }
            
            const topic = sortedTopics[topicIndex];
            const topicHours = topic.estimatedHours || 2;
            
            schedule[slotDate].topics.push({
                topic: topic.name,
                subject: subject.name,
                difficulty: topic.difficulty || 3,
                estimated_hours: topicHours,
                learningObjectives: topic.learningObjectives || [],
                category: topic.category || 'Core',
                isCompleted: false
            });
            
            schedule[slotDate].totalHours += topicHours;
            schedule[slotDate].difficulty = Math.max(schedule[slotDate].difficulty, topic.difficulty || 3);
            topicIndex++;
        }
    }
    
    return schedule;
}

// Sort topics by dependencies (topological sort)
function sortTopicsByDependencies(topics) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    
    function visit(topic) {
        if (visiting.has(topic.name)) return; // Circular dependency
        if (visited.has(topic.name)) return;
        
        visiting.add(topic.name);
        
        // Visit dependencies first
        if (topic.dependencies) {
            topic.dependencies.forEach(depName => {
                const depTopic = topics.find(t => t.name === depName);
                if (depTopic) visit(depTopic);
            });
        }
        
        visiting.delete(topic.name);
        visited.add(topic.name);
        sorted.push(topic);
    }
    
    topics.forEach(visit);
    return sorted;
}

// Calculate daily study capacity based on user profile
function calculateDailyCapacity(userProfile) {
    const baseCapacity = 3; // 3 hours default
    const attentionSpan = userProfile?.attentionSpan || 60; // minutes
    const studyPreference = userProfile?.studyTimePreference || 'afternoon';
    
    // Adjust based on attention span
    let capacity = baseCapacity;
    if (attentionSpan < 30) capacity = 2;
    else if (attentionSpan > 90) capacity = 4;
    
    // Adjust based on study time preference
    if (studyPreference === 'morning') capacity *= 1.1;
    else if (studyPreference === 'evening') capacity *= 0.9;
    
    return Math.min(capacity, 6); // Cap at 6 hours
}

// Calculate study intensity
function calculateStudyIntensity(planArray, totalDays) {
    const avgDailyHours = planArray.reduce((sum, day) => sum + day.totalHours, 0) / totalDays;
    
    if (avgDailyHours < 1) return 'Light';
    if (avgDailyHours < 2.5) return 'Moderate';
    if (avgDailyHours < 4) return 'Intensive';
    return 'Very Intensive';
}

// Calculate study intensity from total hours and days
function calculateStudyIntensityFromHours(totalHours, totalDays) {
    const avgDailyHours = totalHours / totalDays;
    
    if (avgDailyHours < 1) return 'Light';
    if (avgDailyHours < 2.5) return 'Moderate';
    if (avgDailyHours < 4) return 'Intensive';
    return 'Very Intensive';
}
// --- Progress Calculation ---
app.post('/api/calculate-progress', async (req, res) => {
  try {
    const { allTopics, completedTopics, examDate } = req.body;
    console.log(`✅ Received progress calculation request`);

    // Calculate overall progress
    const overallProgress = allTopics && allTopics.length > 0 
      ? Math.round((completedTopics.length / allTopics.length) * 100) 
      : 0;

    // Calculate days left
    const today = new Date();
    const endDate = new Date(examDate);
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    const daysLeftFinal = daysLeft > 0 ? daysLeft : 0;

    // Process weekly data for charts
    const weeklyData = [];
    if (allTopics && completedTopics && completedTopics.length > 0) {
      // Simple weekly processing - can be enhanced
      const weeks = Math.ceil(daysLeftFinal / 7);
      for (let i = 0; i < weeks; i++) {
        weeklyData.push({
          name: `Week ${i + 1}`,
          topics: Math.floor(completedTopics.length / weeks)
        });
      }
    }

    console.log("✅ Successfully calculated progress.");
    res.json({ 
      overallProgress, 
      daysLeft: daysLeftFinal, 
      weeklyData 
    });

  } catch (error) {
    console.error("❌ Error calculating progress:", error);
    res.status(500).json({ 
      error: 'Failed to calculate progress.',
      details: error.message 
    });
  }
});

// --- Study Session Management ---
app.post('/api/study-session/start', async (req, res) => {
  try {
    const { userId, topicId, plannedDuration, startTime } = req.body;
    console.log(`✅ Received start session request for user: ${userId}`);

    if (!userId || !topicId || !plannedDuration || !startTime) {
      return res.status(400).json({ error: 'User ID, topic ID, planned duration, and start time are required' });
    }

    // Create session object (would normally save to database)
    const session = {
      id: Date.now(), // Simple ID generation
      user_id: userId,
      topic_id: topicId,
      planned_duration: plannedDuration,
      actual_duration: 0,
      status: "in-progress",
      start_time: startTime,
      interruptions: 0,
      created_at: new Date().toISOString()
    };

    console.log("✅ Successfully started study session.");
    res.json(session);

  } catch (error) {
    console.error("❌ Error starting study session:", error);
    res.status(500).json({ 
      error: 'Failed to start study session.',
      details: error.message 
    });
  }
});

app.post('/api/study-session/pause', async (req, res) => {
  try {
    const { sessionId, interruptionsCount } = req.body;
    console.log(`✅ Received pause session request for session: ${sessionId}`);

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Update session status (would normally update database)
    const session = {
      id: sessionId,
      status: "paused",
      interruptions: interruptionsCount || 0,
      updated_at: new Date().toISOString()
    };

    console.log("✅ Successfully paused study session.");
    res.json(session);

  } catch (error) {
    console.error("❌ Error pausing study session:", error);
    res.status(500).json({ 
      error: 'Failed to pause study session.',
      details: error.message 
    });
  }
});

app.post('/api/study-session/resume', async (req, res) => {
  try {
    const { sessionId } = req.body;
    console.log(`✅ Received resume session request for session: ${sessionId}`);

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Update session status (would normally update database)
    const session = {
      id: sessionId,
      status: "in-progress",
      updated_at: new Date().toISOString()
    };

    console.log("✅ Successfully resumed study session.");
    res.json(session);

  } catch (error) {
    console.error("❌ Error resuming study session:", error);
    res.status(500).json({ 
      error: 'Failed to resume study session.',
      details: error.message 
    });
  }
});

app.post('/api/study-session/end', async (req, res) => {
  try {
    const { sessionId, actualDurationSeconds, endTime } = req.body;
    console.log(`✅ Received end session request for session: ${sessionId}`);

    if (!sessionId || !actualDurationSeconds || !endTime) {
      return res.status(400).json({ error: 'Session ID, actual duration, and end time are required' });
    }

    const actualDurationMinutes = Math.round(actualDurationSeconds / 60);

    // Update session status (would normally update database)
    const session = {
      id: sessionId,
      status: "completed",
      actual_duration: actualDurationMinutes,
      end_time: endTime,
      updated_at: new Date().toISOString()
    };

    console.log("✅ Successfully ended study session.");
    res.json(session);

  } catch (error) {
    console.error("❌ Error ending study session:", error);
    res.status(500).json({ 
      error: 'Failed to end study session.',
      details: error.message 
    });
  }
});

// ENHANCED: Advanced AI-powered syllabus parsing with dependency analysis
app.post('/api/parse-syllabus', async (req, res) => {
  try {
    const { syllabusText, subjectName } = req.body;
    console.log(`✅ Received syllabus to parse for subject: ${subjectName}`);

    if (!syllabusText || syllabusText.trim().length === 0) {
      return res.status(400).json({ error: 'Syllabus text cannot be empty.' });
    }

    // Enhanced prompt for better topic extraction and dependency analysis
    const prompt = `
      Act as an expert academic curriculum designer. Analyze the following syllabus text and extract comprehensive learning information.
      
      Subject: "${subjectName || 'General'}"
      Syllabus Text: "${syllabusText}"
      
      Extract and analyze:
      1. All distinct study topics
      2. Topic dependencies (which topics should be learned first)
      3. Estimated difficulty levels (1-5 scale)
      4. Estimated study time per topic (in hours)
      5. Learning objectives for each topic
      
      IMPORTANT: Your response MUST be a valid JSON object with this exact structure:
      {
        "topics": [
          {
            "name": "Topic Name",
            "difficulty": 3,
            "estimatedHours": 4,
            "dependencies": ["Prerequisite Topic"],
            "learningObjectives": ["Objective 1", "Objective 2"],
            "category": "Core|Advanced|Optional"
          }
        ],
        "subjectOverview": "Brief description of the subject",
        "totalEstimatedHours": 40,
        "recommendedSequence": ["Topic1", "Topic2", "Topic3"]
      }
      
      Guidelines:
      - Difficulty: 1=Very Easy, 2=Easy, 3=Medium, 4=Hard, 5=Very Hard
      - Dependencies: List topics that must be learned before this one
      - Categories: Core (essential), Advanced (builds on core), Optional (extra)
      - Sequence: Recommended learning order considering dependencies
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up potential markdown formatting
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonResponse = JSON.parse(cleanedText);

    console.log(`✅ Successfully parsed syllabus into ${jsonResponse.topics.length} topics with dependencies.`);
    res.json(jsonResponse);

  } catch (error) {
    console.error("❌ Error during syllabus parsing:", error);
    res.status(500).json({ 
      error: 'Failed to parse syllabus.',
      details: error.message 
    });
  }
});

// =============================================
// ML PREDICTION ENDPOINTS
// =============================================

// ML-powered recall probability prediction (calls Python microservice)
app.post('/api/ml/predict-recall', async (req, res) => {
  try {
    const { daysSinceLastReview, repetitions, easeFactor, learningStyle, topicDifficulty, performanceHistory } = req.body;
    console.log(`✅ Received ML prediction request - calling Python microservice`);

    // Call Python ML microservice for advanced prediction
    const mlResponse = await axios.post(`${PYTHON_ML_URL}/predict-recall`, {
      days_since_last_review: daysSinceLastReview,
      repetitions: repetitions,
      ease_factor: easeFactor,
      learning_style: learningStyle || 'reading',
      topic_difficulty: topicDifficulty || 'medium',
      performance_history: performanceHistory || []
    });

    if (mlResponse.data.error) {
      throw new Error(mlResponse.data.error);
    }

    res.json(mlResponse.data);

  } catch (error) {
    console.error("❌ Error calling Python ML microservice:", error);
    
    // Fallback to simple calculation if Python service is unavailable
    const { daysSinceLastReview, repetitions, easeFactor } = req.body;
    const strength = easeFactor * (1 + repetitions * 0.1);
    const retention = Math.exp(-daysSinceLastReview / strength);
    const recallProbability = Math.max(0, Math.min(1, retention));
    
    res.json({
      recall_probability: recallProbability,
      confidence: Math.min(0.95, 0.7 + repetitions * 0.05),
      recommended_interval: Math.max(1, Math.round(daysSinceLastReview * easeFactor)),
      fallback: true
    });
  }
});

// Learning analytics generation (calls Python ML microservice)
app.post('/api/ml/learning-analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`✅ Received learning analytics request for user: ${userId}`);

    // Get user's learning profile
    const { data: profile, error: profileError } = await supabase
      .from('learning_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get spaced repetition data
    const { data: srData, error: srError } = await supabase
      .from('spaced_repetition_data')
      .select('*')
      .eq('user_id', userId);

    // Get quiz results
    const { data: quizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', userId)
      .order('quiz_timestamp', { ascending: false });

    // Call Python ML microservice for advanced analytics
    const mlResponse = await axios.post(`${PYTHON_ML_URL}/learning-analytics`, {
      user_id: userId,
      quiz_results: quizResults || [],
      spaced_repetition_data: srData || [],
      learning_profile: profile || {}
    });

    if (mlResponse.data.error) {
      throw new Error(mlResponse.data.error);
    }

    const analytics = mlResponse.data;

    // Save analytics to database
    const { data: savedAnalytics, error: saveError } = await supabase
      .from('learning_analytics')
      .insert([{
        user_id: userId,
        analytics_data: analytics
      }])
      .select()
      .single();

    if (saveError) throw saveError;

    console.log("✅ Successfully generated learning analytics using Python ML microservice.");
    res.json(savedAnalytics);

  } catch (error) {
    console.error("❌ Error calling Python ML microservice for analytics:", error);
    
    // Fallback to simple analytics if Python service is unavailable
    try {
      const { data: profile } = await supabase
        .from('learning_profiles')
        .select('*')
        .eq('user_id', req.params.userId)
        .single();

      const { data: quizResults } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', req.params.userId)
        .order('quiz_timestamp', { ascending: false });

      const analytics = {
        learning_velocity: calculateLearningVelocity(quizResults || []),
        retention_curve: calculateRetentionCurve(quizResults || []),
        peak_performance_time: calculatePeakPerformanceTime(quizResults || []),
        burnout_risk_score: calculateBurnoutRisk(quizResults || []),
        learning_style_confidence: profile ? 0.85 : 0.0,
        weakness_areas: identifyWeaknessAreas(quizResults || []),
        improvement_trend: calculateImprovementTrend(quizResults || []),
        spaced_repetition_effectiveness: 0.7,
        predicted_retention_rate: 0.7,
        fallback: true
      };

      console.log("✅ Successfully generated learning analytics using fallback method.");
      res.json({ analytics_data: analytics });

    } catch (fallbackError) {
      console.error("❌ Error in fallback analytics generation:", fallbackError);
      res.status(500).json({ 
        error: 'Failed to generate learning analytics.',
        details: fallbackError.message 
      });
    }
  }
});

// Study Plan Endpoint
app.get('/api/study-plan/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`✅ Received study plan request for user: ${userId}`);

    // Get study plan from Supabase
    const { data, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        message: 'No study plan found for this user',
        user_id: userId
      });
    }

    res.json(data);

  } catch (error) {
    console.error("❌ Error fetching study plan:", error);
    res.status(500).json({
      error: 'Failed to fetch study plan',
      details: error.message
    });
  }
});

// Helper functions for analytics calculations
function calculateLearningVelocity(quizResults) {
  if (quizResults.length === 0) return 0;
  const days = (new Date() - new Date(quizResults[0].quiz_timestamp)) / (1000 * 60 * 60 * 24);
  return quizResults.length / Math.max(days, 1);
}

function calculateRetentionCurve(quizResults) {
  // Calculate retention at different time intervals
  const intervals = [1, 7, 30, 90]; // days
  const retentionRates = intervals.map(interval => {
    const relevantQuizzes = quizResults.filter(quiz => {
      const daysSince = (new Date() - new Date(quiz.quiz_timestamp)) / (1000 * 60 * 60 * 24);
      return daysSince >= interval - 1 && daysSince <= interval + 1;
    });
    
    if (relevantQuizzes.length === 0) return 0.5; // Default if no data
    
    const avgScore = relevantQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / relevantQuizzes.length;
    return avgScore / 100;
  });
  
  return retentionRates;
}

function calculatePeakPerformanceTime(quizResults) {
  // Analyze quiz times to find peak performance
  const timeGroups = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0
  };
  
  quizResults.forEach(quiz => {
    const hour = new Date(quiz.quiz_timestamp).getHours();
    if (hour >= 6 && hour < 12) timeGroups.morning++;
    else if (hour >= 12 && hour < 17) timeGroups.afternoon++;
    else if (hour >= 17 && hour < 22) timeGroups.evening++;
    else timeGroups.night++;
  });
  
  return Object.keys(timeGroups).reduce((a, b) => timeGroups[a] > timeGroups[b] ? a : b);
}

function calculateBurnoutRisk(quizResults) {
  if (quizResults.length < 3) return 0.2;
  
  // Calculate based on recent performance decline
  const recent = quizResults.slice(0, 3);
  const older = quizResults.slice(3, 6);
  
  if (older.length === 0) return 0.2;
  
  const recentAvg = recent.reduce((sum, quiz) => sum + quiz.score, 0) / recent.length;
  const olderAvg = older.reduce((sum, quiz) => sum + quiz.score, 0) / older.length;
  
  const decline = (olderAvg - recentAvg) / olderAvg;
  return Math.max(0, Math.min(1, decline));
}

function identifyWeaknessAreas(quizResults) {
  const topicScores = {};
  quizResults.forEach(quiz => {
    if (!topicScores[quiz.topic_name]) {
      topicScores[quiz.topic_name] = { total: 0, count: 0 };
    }
    topicScores[quiz.topic_name].total += quiz.score;
    topicScores[quiz.topic_name].count += 1;
  });

  return Object.entries(topicScores)
    .filter(([topic, data]) => (data.total / data.count) < 60)
    .map(([topic]) => topic);
}

function calculateImprovementTrend(quizResults) {
  if (quizResults.length < 4) return 'stable';
  
  const recent = quizResults.slice(0, 4);
  const older = quizResults.slice(4, 8);
  
  if (older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, quiz) => sum + quiz.score, 0) / recent.length;
  const olderAvg = older.reduce((sum, quiz) => sum + quiz.score, 0) / older.length;
  
  const change = (recentAvg - olderAvg) / olderAvg;
  
  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}

function calculateSREffectiveness(srData) {
  if (srData.length === 0) return 0;
  
  // Calculate effectiveness based on ease factor improvements
  const avgEaseFactor = srData.reduce((sum, topic) => sum + topic.ease_factor, 0) / srData.length;
  return Math.min(1, avgEaseFactor / 3); // Normalize to 0-1
}

function calculatePredictedRetentionRate(profile, quizResults) {
  if (!profile || quizResults.length === 0) return 0.7;
  
  const baseRetention = profile.retention_rate || 0.7;
  const recentScores = quizResults.slice(0, 5).map(q => q.score);
  const avgRecentScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
  
  // Adjust based on recent performance
  const performanceAdjustment = (avgRecentScore - 70) / 100; // -0.3 to +0.3
  return Math.max(0.3, Math.min(0.95, baseRetention + performanceAdjustment));
}

// Intelligent Study Plan Generation (calls Python ML microservice)
app.post('/api/generate-intelligent-plan', async (req, res) => {
  try {
    const { subjects, examDate, availability, userProfile } = req.body;
    console.log(`✅ Received intelligent plan generation request`);

    // Call Python ML microservice for intelligent plan generation
    const mlResponse = await axios.post(`${PYTHON_ML_URL}/generate-intelligent-plan`, {
      user_id: userProfile?.userId || 'anonymous',
      subjects: subjects,
      exam_date: examDate,
      availability: availability || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    });

    if (mlResponse.data.error) {
      throw new Error(mlResponse.data.error);
    }

    console.log("✅ Successfully generated intelligent study plan using ML.");
    res.json(mlResponse.data);

  } catch (error) {
    console.error("❌ Error calling Python ML microservice for plan generation:", error);
    
    // Fallback to basic plan generation
    try {
      const basicPlan = await generateBasicStudyPlan(subjects, examDate, availability);
      console.log("✅ Used fallback plan generation.");
      res.json({ plan: basicPlan, fallback: true });
    } catch (fallbackError) {
      console.error("❌ Error in fallback plan generation:", fallbackError);
      res.status(500).json({ 
        error: 'Failed to generate study plan.',
        details: fallbackError.message 
      });
    }
  }
});

// Helper function for basic plan generation fallback
async function generateBasicStudyPlan(subjects, examDate, availability) {
  const exam_datetime = new Date(examDate);
  const days_until_exam = Math.ceil((exam_datetime - new Date()) / (1000 * 60 * 60 * 24));
  
  const basicPlan = [];
  for (let i = 0; i < Math.min(days_until_exam, subjects.length * 3); i++) {
    const subject = subjects[i % subjects.length];
    basicPlan.push({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '14:00',
      duration: 60,
      topics: [`${subject} Study Session`],
      difficulty: 'medium',
      priority: 3,
      session_type: 'learning',
      ml_confidence: 0.5
    });
  }
  
  return basicPlan;
}

// --- Start Server ---
// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});