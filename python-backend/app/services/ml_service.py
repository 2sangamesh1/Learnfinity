"""
Machine Learning Service for Personalized Learning
Trains models on synthetic and real user data
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
from sqlalchemy.orm import Session
from app.core.database import get_db, User, StudySession, QuizResult, LearningProfile, SpacedRepetitionData
import openai
from app.core.config import settings

class MLService:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.models_loaded = False
        self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
    async def initialize_models(self):
        """Initialize and train all ML models"""
        print("🧠 Initializing ML models...")
        
        # Load and prepare data
        data = await self._load_training_data()
        
        # Train models
        await self._train_performance_predictor(data)
        await self._train_optimal_interval_predictor(data)
        await self._train_learning_style_classifier(data)
        await self._train_difficulty_recommender(data)
        await self._train_retention_predictor(data)
        
        self.models_loaded = True
        print("✅ All ML models initialized and trained")
        
    async def _load_training_data(self) -> pd.DataFrame:
        """Load and prepare training data from database"""
        db = next(get_db())
        try:
            # Load all relevant data
            query = """
            SELECT 
                u.id as user_id,
                lp.learning_style,
                lp.attention_span,
                lp.difficulty_preference,
                lp.study_time_preference,
                lp.retention_rate,
                lp.improvement_rate,
                qr.topic_name,
                qr.score,
                qr.difficulty,
                qr.time_taken,
                qr.questions_attempted,
                qr.correct_answers,
                ss.planned_duration,
                ss.actual_duration,
                ss.interruptions,
                srd.interval,
                srd.ease_factor,
                srd.forgetting_probability
            FROM users u
            LEFT JOIN learning_profiles lp ON u.id = lp.user_id
            LEFT JOIN quiz_results qr ON u.id = qr.user_id
            LEFT JOIN study_sessions ss ON u.id = ss.user_id
            LEFT JOIN spaced_repetition_data srd ON u.id = srd.user_id AND qr.topic_name = srd.topic_name
            """
            
            df = pd.read_sql(query, db.bind)
            
            # Clean and preprocess data
            df = self._preprocess_data(df)
            
            return df
        finally:
            db.close()
            
    def _preprocess_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Preprocess data for ML training"""
        # Handle missing values
        df = df.fillna({
            'learning_style': 'reading',
            'attention_span': 60,
            'difficulty_preference': 'medium',
            'study_time_preference': 'afternoon',
            'retention_rate': 0.6,
            'improvement_rate': 0.3,
            'interval': 7,
            'ease_factor': 2.5,
            'forgetting_probability': 0.3
        })
        
        # Encode categorical variables
        categorical_columns = ['learning_style', 'difficulty_preference', 'study_time_preference', 'difficulty']
        for col in categorical_columns:
            if col in df.columns:
                le = LabelEncoder()
                df[f'{col}_encoded'] = le.fit_transform(df[col])
                self.encoders[col] = le
        
        # Create additional features
        df['performance_ratio'] = df['correct_answers'] / df['questions_attempted']
        df['time_per_question'] = df['time_taken'] / df['questions_attempted']
        df['session_efficiency'] = df['actual_duration'] / df['planned_duration']
        
        return df
        
    async def _train_performance_predictor(self, data: pd.DataFrame):
        """Train model to predict quiz performance"""
        print("🎯 Training performance predictor...")
        
        # Prepare features and target
        feature_columns = [
            'learning_style_encoded', 'attention_span', 'difficulty_preference_encoded',
            'study_time_preference_encoded', 'retention_rate', 'improvement_rate',
            'time_per_question', 'session_efficiency', 'interval', 'ease_factor'
        ]
        
        X = data[feature_columns].fillna(0)
        y = data['score'].fillna(50)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"Performance Predictor - MSE: {mse:.2f}, R²: {r2:.2f}")
        
        # Save model
        self.models['performance_predictor'] = model
        self.scalers['performance_predictor'] = scaler
        
    async def _train_optimal_interval_predictor(self, data: pd.DataFrame):
        """Train model to predict optimal spaced repetition intervals"""
        print("⏰ Training optimal interval predictor...")
        
        # Prepare features
        feature_columns = [
            'learning_style_encoded', 'attention_span', 'retention_rate',
            'improvement_rate', 'performance_ratio', 'forgetting_probability'
        ]
        
        X = data[feature_columns].fillna(0)
        y = data['interval'].fillna(7)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"Interval Predictor - MSE: {mse:.2f}, R²: {r2:.2f}")
        
        # Save model
        self.models['interval_predictor'] = model
        self.scalers['interval_predictor'] = scaler
        
    async def _train_learning_style_classifier(self, data: pd.DataFrame):
        """Train model to classify learning styles based on behavior"""
        print("🎨 Training learning style classifier...")
        
        # Prepare features
        feature_columns = [
            'attention_span', 'retention_rate', 'improvement_rate',
            'time_per_question', 'session_efficiency', 'performance_ratio'
        ]
        
        X = data[feature_columns].fillna(0)
        y = data['learning_style_encoded'].fillna(0)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        accuracy = np.mean(np.round(y_pred) == y_test)
        
        print(f"Learning Style Classifier - Accuracy: {accuracy:.2f}")
        
        # Save model
        self.models['learning_style_classifier'] = model
        self.scalers['learning_style_classifier'] = scaler
        
    async def _train_difficulty_recommender(self, data: pd.DataFrame):
        """Train model to recommend optimal difficulty levels"""
        print("📊 Training difficulty recommender...")
        
        # Prepare features
        feature_columns = [
            'learning_style_encoded', 'attention_span', 'retention_rate',
            'improvement_rate', 'performance_ratio', 'time_per_question'
        ]
        
        X = data[feature_columns].fillna(0)
        y = data['difficulty_preference_encoded'].fillna(1)  # 1 = medium
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        accuracy = np.mean(np.round(y_pred) == y_test)
        
        print(f"Difficulty Recommender - Accuracy: {accuracy:.2f}")
        
        # Save model
        self.models['difficulty_recommender'] = model
        self.scalers['difficulty_recommender'] = scaler
        
    async def _train_retention_predictor(self, data: pd.DataFrame):
        """Train model to predict retention rates"""
        print("🧠 Training retention predictor...")
        
        # Prepare features
        feature_columns = [
            'learning_style_encoded', 'attention_span', 'improvement_rate',
            'performance_ratio', 'time_per_question', 'session_efficiency'
        ]
        
        X = data[feature_columns].fillna(0)
        y = data['retention_rate'].fillna(0.6)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"Retention Predictor - MSE: {mse:.2f}, R²: {r2:.2f}")
        
        # Save model
        self.models['retention_predictor'] = model
        self.scalers['retention_predictor'] = scaler
        
    async def predict_performance(self, user_features: Dict[str, Any]) -> float:
        """Predict quiz performance for a user"""
        if not self.models_loaded:
            return 75.0  # Default prediction
            
        model = self.models['performance_predictor']
        scaler = self.scalers['performance_predictor']
        
        # Prepare features
        features = self._prepare_features(user_features)
        features_scaled = scaler.transform([features])
        
        prediction = model.predict(features_scaled)[0]
        return max(0, min(100, prediction))
        
    async def predict_optimal_interval(self, user_features: Dict[str, Any], topic_features: Dict[str, Any]) -> int:
        """Predict optimal spaced repetition interval"""
        if not self.models_loaded:
            return 7  # Default interval
            
        model = self.models['interval_predictor']
        scaler = self.scalers['interval_predictor']
        
        # Combine user and topic features
        features = {**user_features, **topic_features}
        features_array = self._prepare_features(features)
        features_scaled = scaler.transform([features_array])
        
        prediction = model.predict(features_scaled)[0]
        return max(1, int(prediction))
        
    async def recommend_difficulty(self, user_features: Dict[str, Any]) -> str:
        """Recommend optimal difficulty level"""
        if not self.models_loaded:
            return 'medium'
            
        model = self.models['difficulty_recommender']
        scaler = self.scalers['difficulty_recommender']
        
        features = self._prepare_features(user_features)
        features_scaled = scaler.transform([features])
        
        prediction = model.predict(features_scaled)[0]
        difficulty_encoded = int(round(prediction))
        
        # Convert back to string
        difficulty_mapping = {0: 'easy', 1: 'medium', 2: 'hard'}
        return difficulty_mapping.get(difficulty_encoded, 'medium')
        
    async def predict_retention(self, user_features: Dict[str, Any]) -> float:
        """Predict retention rate for a user"""
        if not self.models_loaded:
            return 0.6  # Default retention rate
            
        model = self.models['retention_predictor']
        scaler = self.scalers['retention_predictor']
        
        features = self._prepare_features(user_features)
        features_scaled = scaler.transform([features])
        
        prediction = model.predict(features_scaled)[0]
        return max(0, min(1, prediction))
        
    def _prepare_features(self, features: Dict[str, Any]) -> List[float]:
        """Prepare features for model prediction"""
        # Default feature values
        default_features = {
            'learning_style_encoded': 0,
            'attention_span': 60,
            'difficulty_preference_encoded': 1,
            'study_time_preference_encoded': 1,
            'retention_rate': 0.6,
            'improvement_rate': 0.3,
            'time_per_question': 30,
            'session_efficiency': 1.0,
            'interval': 7,
            'ease_factor': 2.5,
            'performance_ratio': 0.7,
            'forgetting_probability': 0.3
        }
        
        # Update with provided features
        default_features.update(features)
        
        # Return as list in correct order
        feature_order = [
            'learning_style_encoded', 'attention_span', 'difficulty_preference_encoded',
            'study_time_preference_encoded', 'retention_rate', 'improvement_rate',
            'time_per_question', 'session_efficiency', 'interval', 'ease_factor',
            'performance_ratio', 'forgetting_probability'
        ]
        
        return [default_features.get(f, 0) for f in feature_order]
        
    async def generate_ai_recommendations(self, user_id: str, performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI-powered study recommendations using OpenAI"""
        try:
            prompt = f"""
            As an AI study advisor, analyze this student's learning data and provide personalized recommendations:
            
            Performance Data: {performance_data}
            
            Provide:
            1. Learning pattern analysis (2-3 sentences)
            2. 3-5 specific study recommendations
            3. Suggested focus areas
            4. Motivational insights
            
            Format as JSON with keys: analysis, recommendations, focus_areas, motivation
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"Error generating AI recommendations: {e}")
            return {
                "analysis": "Based on your learning patterns, you show consistent progress.",
                "recommendations": [
                    {"title": "Focus on weak areas", "description": "Spend extra time on challenging topics"},
                    {"title": "Maintain consistency", "description": "Study regularly for better retention"}
                ],
                "focus_areas": ["Problem-solving", "Conceptual understanding"],
                "motivation": "Keep up the great work! Your dedication is paying off."
            }



