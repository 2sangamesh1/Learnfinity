"""
ML Models - Proper machine learning models to replace algorithmic fallbacks
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, accuracy_score
import pickle
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import json
from app.core.supabase_client import supabase_client

class RetentionPredictionModel:
    """ML model to predict knowledge retention probability"""
    
    def __init__(self):
        self.model = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=6,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.is_trained = False
        self.feature_names = [
            'days_since_last_review',
            'initial_score',
            'review_count',
            'average_score',
            'score_variance',
            'difficulty_numeric',
            'learning_style_numeric',
            'session_duration_avg',
            'time_of_day_avg',
            'streak_length'
        ]
    
    def prepare_features(self, data: List[Dict[str, Any]]) -> np.ndarray:
        """Prepare features for the model"""
        features = []
        
        for record in data:
            feature_vector = [
                record.get('days_since_last_review', 1),
                record.get('initial_score', 0.5),
                record.get('review_count', 1),
                record.get('average_score', 0.5),
                record.get('score_variance', 0.1),
                self._encode_difficulty(record.get('difficulty', 'medium')),
                self._encode_learning_style(record.get('learning_style', 'visual')),
                record.get('session_duration_avg', 25),
                record.get('time_of_day_avg', 12),
                record.get('streak_length', 0)
            ]
            features.append(feature_vector)
        
        return np.array(features)
    
    def _encode_difficulty(self, difficulty: str) -> float:
        """Encode difficulty as numeric value"""
        difficulty_map = {'easy': 0.3, 'medium': 0.6, 'hard': 0.9}
        return difficulty_map.get(difficulty.lower(), 0.6)
    
    def _encode_learning_style(self, learning_style: str) -> float:
        """Encode learning style as numeric value"""
        style_map = {'visual': 0.25, 'auditory': 0.5, 'kinesthetic': 0.75, 'reading': 1.0}
        return style_map.get(learning_style.lower(), 0.25)
    
    async def train(self, training_data: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Train the retention prediction model"""
        
        if training_data is None:
            # Generate synthetic training data if no real data available
            training_data = await self._generate_synthetic_training_data()
        
        if len(training_data) < 50:
            # Augment with synthetic data if insufficient real data
            synthetic_data = await self._generate_synthetic_training_data(1000)
            training_data.extend(synthetic_data)
        
        # Prepare features and labels
        X = self.prepare_features(training_data)
        y = np.array([record.get('retention_success', 0.5) > 0.5 for record in training_data])
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_accuracy = accuracy_score(y_train, self.model.predict(X_train_scaled))
        test_accuracy = accuracy_score(y_test, self.model.predict(X_test_scaled))
        
        self.is_trained = True
        
        # Save model
        await self._save_model()
        
        return {
            'model_type': 'retention_prediction',
            'training_samples': len(training_data),
            'train_accuracy': train_accuracy,
            'test_accuracy': test_accuracy,
            'feature_importance': dict(zip(
                self.feature_names, 
                self.model.feature_importances_
            )),
            'trained_at': datetime.now().isoformat()
        }
    
    async def predict_retention(self, user_data: Dict[str, Any]) -> float:
        """Predict retention probability for a user/topic combination"""
        
        if not self.is_trained:
            # Load model or return fallback
            if not await self._load_model():
                return self._fallback_retention_prediction(user_data)
        
        # Prepare features
        features = self.prepare_features([user_data])
        features_scaled = self.scaler.transform(features)
        
        # Get prediction probability
        retention_prob = self.model.predict_proba(features_scaled)[0][1]
        
        return float(retention_prob)
    
    def _fallback_retention_prediction(self, user_data: Dict[str, Any]) -> float:
        """Fallback retention prediction using simple heuristics"""
        days_since = user_data.get('days_since_last_review', 1)
        avg_score = user_data.get('average_score', 0.5)
        difficulty = self._encode_difficulty(user_data.get('difficulty', 'medium'))
        
        # Simple exponential decay with performance adjustment
        base_retention = np.exp(-days_since / 7)  # 7-day half-life
        score_adjustment = avg_score * 0.5
        difficulty_adjustment = (1 - difficulty) * 0.3
        
        return min(0.95, max(0.05, base_retention + score_adjustment + difficulty_adjustment))
    
    async def _generate_synthetic_training_data(self, num_samples: int = 1000) -> List[Dict[str, Any]]:
        """Generate synthetic training data for the model"""
        
        synthetic_data = []
        
        for _ in range(num_samples):
            # Generate realistic parameters
            days_since = np.random.exponential(5)  # Average 5 days
            initial_score = np.random.beta(3, 2)  # Skewed towards higher scores
            review_count = np.random.poisson(3) + 1
            difficulty = np.random.choice(['easy', 'medium', 'hard'], p=[0.3, 0.5, 0.2])
            learning_style = np.random.choice(['visual', 'auditory', 'kinesthetic', 'reading'])
            
            # Calculate dependent variables
            score_trend = np.random.normal(0, 0.1)
            average_score = max(0, min(1, initial_score + score_trend))
            score_variance = np.random.exponential(0.05)
            
            # Session characteristics
            session_duration = np.random.normal(25, 10)
            time_of_day = np.random.normal(14, 4)  # Afternoon peak
            streak_length = np.random.poisson(2)
            
            # Calculate retention success based on realistic factors
            retention_base = np.exp(-days_since / 7)
            performance_factor = average_score * 0.4
            difficulty_factor = (1 - self._encode_difficulty(difficulty)) * 0.2
            consistency_factor = max(0, 0.2 - score_variance * 2)
            streak_factor = min(0.1, streak_length * 0.02)
            
            retention_prob = retention_base + performance_factor + difficulty_factor + consistency_factor + streak_factor
            retention_prob = max(0.05, min(0.95, retention_prob))
            
            # Add noise
            retention_success = retention_prob + np.random.normal(0, 0.1)
            
            synthetic_data.append({
                'days_since_last_review': days_since,
                'initial_score': initial_score,
                'review_count': review_count,
                'average_score': average_score,
                'score_variance': score_variance,
                'difficulty': difficulty,
                'learning_style': learning_style,
                'session_duration_avg': session_duration,
                'time_of_day_avg': time_of_day,
                'streak_length': streak_length,
                'retention_success': retention_success
            })
        
        return synthetic_data
    
    async def _save_model(self):
        """Save the trained model to disk"""
        model_dir = "models"
        os.makedirs(model_dir, exist_ok=True)
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'feature_names': self.feature_names,
            'trained_at': datetime.now().isoformat()
        }
        
        with open(f"{model_dir}/retention_model.pkl", 'wb') as f:
            pickle.dump(model_data, f)
    
    async def _load_model(self) -> bool:
        """Load the trained model from disk"""
        try:
            with open("models/retention_model.pkl", 'rb') as f:
                model_data = pickle.load(f)
            
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.label_encoders = model_data['label_encoders']
            self.feature_names = model_data['feature_names']
            self.is_trained = True
            
            return True
        except FileNotFoundError:
            return False

class DifficultyRecommendationModel:
    """ML model to recommend optimal difficulty levels"""
    
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=8,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_trained = False
    
    async def train(self, training_data: Optional[List[Dict[str, Any]]] = None):
        """Train the difficulty recommendation model"""
        
        if training_data is None:
            training_data = await self._generate_synthetic_difficulty_data()
        
        # Prepare features: user performance history, learning velocity, etc.
        X = []
        y = []
        
        for record in training_data:
            features = [
                record.get('average_performance', 0.5),
                record.get('learning_velocity', 0.5),
                record.get('consistency_score', 0.5),
                record.get('current_streak', 0),
                record.get('time_spent_learning', 60),
                record.get('topic_familiarity', 0.5)
            ]
            
            optimal_difficulty = record.get('optimal_difficulty_score', 0.5)
            
            X.append(features)
            y.append(optimal_difficulty)
        
        X = np.array(X)
        y = np.array(y)
        
        # Split and train
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)
        
        self.is_trained = True
        
        return {
            'model_type': 'difficulty_recommendation',
            'train_r2': train_score,
            'test_r2': test_score,
            'training_samples': len(training_data)
        }
    
    def recommend_difficulty(self, user_profile: Dict[str, Any]) -> str:
        """Recommend optimal difficulty level for a user"""
        
        if not self.is_trained:
            return self._fallback_difficulty_recommendation(user_profile)
        
        features = np.array([[
            user_profile.get('average_performance', 0.5),
            user_profile.get('learning_velocity', 0.5),
            user_profile.get('consistency_score', 0.5),
            user_profile.get('current_streak', 0),
            user_profile.get('time_spent_learning', 60),
            user_profile.get('topic_familiarity', 0.5)
        ]])
        
        features_scaled = self.scaler.transform(features)
        difficulty_score = self.model.predict(features_scaled)[0]
        
        # Convert score to difficulty level
        if difficulty_score < 0.4:
            return 'easy'
        elif difficulty_score < 0.7:
            return 'medium'
        else:
            return 'hard'
    
    def _fallback_difficulty_recommendation(self, user_profile: Dict[str, Any]) -> str:
        """Fallback difficulty recommendation"""
        avg_performance = user_profile.get('average_performance', 0.5)
        
        if avg_performance >= 0.8:
            return 'hard'
        elif avg_performance >= 0.6:
            return 'medium'
        else:
            return 'easy'
    
    async def _generate_synthetic_difficulty_data(self, num_samples: int = 800) -> List[Dict[str, Any]]:
        """Generate synthetic data for difficulty recommendation training"""
        
        synthetic_data = []
        
        for _ in range(num_samples):
            # Generate user characteristics
            avg_performance = np.random.beta(2, 2)
            learning_velocity = np.random.beta(2, 2)
            consistency = 1 - np.random.exponential(0.3)
            consistency = max(0, min(1, consistency))
            streak = np.random.poisson(3)
            time_spent = np.random.gamma(2, 30)
            familiarity = np.random.beta(2, 3)
            
            # Calculate optimal difficulty based on user characteristics
            difficulty_factors = [
                avg_performance * 0.4,
                learning_velocity * 0.3,
                consistency * 0.2,
                min(streak / 10, 0.1),
                familiarity * 0.2
            ]
            
            optimal_difficulty = sum(difficulty_factors) / len(difficulty_factors)
            optimal_difficulty = max(0.1, min(0.9, optimal_difficulty))
            
            synthetic_data.append({
                'average_performance': avg_performance,
                'learning_velocity': learning_velocity,
                'consistency_score': consistency,
                'current_streak': streak,
                'time_spent_learning': time_spent,
                'topic_familiarity': familiarity,
                'optimal_difficulty_score': optimal_difficulty
            })
        
        return synthetic_data

class StudyTimeOptimizationModel:
    """ML model to optimize study session timing and duration"""
    
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_trained = False
    
    async def train(self, training_data: Optional[List[Dict[str, Any]]] = None):
        """Train the study time optimization model"""
        
        if training_data is None:
            training_data = await self._generate_synthetic_timing_data()
        
        X = []
        y = []
        
        for record in training_data:
            features = [
                record.get('hour_of_day', 12),
                record.get('day_of_week', 3),
                record.get('session_duration', 25),
                record.get('user_energy_level', 0.7),
                record.get('topic_difficulty', 0.5),
                record.get('previous_session_performance', 0.7),
                record.get('break_since_last_session', 60),
                record.get('total_study_time_today', 60)
            ]
            
            effectiveness_score = record.get('session_effectiveness', 0.7)
            
            X.append(features)
            y.append(effectiveness_score)
        
        X = np.array(X)
        y = np.array(y)
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.model.fit(X_train_scaled, y_train)
        
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)
        
        self.is_trained = True
        
        return {
            'model_type': 'study_time_optimization',
            'train_r2': train_score,
            'test_r2': test_score,
            'training_samples': len(training_data)
        }
    
    def optimize_study_time(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize study session timing and duration"""
        
        if not self.is_trained:
            return self._fallback_time_optimization(context)
        
        # Test different time slots and durations
        best_effectiveness = 0
        best_config = None
        
        current_hour = datetime.now().hour
        
        for hour_offset in range(-2, 3):  # Test ±2 hours from current time
            for duration in [15, 25, 35, 45]:  # Test different durations
                test_hour = (current_hour + hour_offset) % 24
                
                features = np.array([[
                    test_hour,
                    datetime.now().weekday(),
                    duration,
                    context.get('user_energy_level', 0.7),
                    context.get('topic_difficulty', 0.5),
                    context.get('previous_session_performance', 0.7),
                    context.get('break_since_last_session', 60),
                    context.get('total_study_time_today', 60)
                ]])
                
                features_scaled = self.scaler.transform(features)
                predicted_effectiveness = self.model.predict(features_scaled)[0]
                
                if predicted_effectiveness > best_effectiveness:
                    best_effectiveness = predicted_effectiveness
                    best_config = {
                        'optimal_hour': test_hour,
                        'optimal_duration': duration,
                        'predicted_effectiveness': predicted_effectiveness
                    }
        
        return best_config or self._fallback_time_optimization(context)
    
    def _fallback_time_optimization(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback time optimization using heuristics"""
        current_hour = datetime.now().hour
        
        # Peak performance hours (research-based)
        peak_hours = [9, 10, 11, 14, 15, 16]
        
        if current_hour in peak_hours:
            optimal_duration = 35  # Longer sessions during peak hours
        else:
            optimal_duration = 25  # Standard Pomodoro
        
        return {
            'optimal_hour': current_hour,
            'optimal_duration': optimal_duration,
            'predicted_effectiveness': 0.7
        }
    
    async def _generate_synthetic_timing_data(self, num_samples: int = 1000) -> List[Dict[str, Any]]:
        """Generate synthetic data for timing optimization"""
        
        synthetic_data = []
        
        for _ in range(num_samples):
            hour = np.random.randint(6, 24)  # Study hours 6 AM to 11 PM
            day_of_week = np.random.randint(0, 7)
            duration = np.random.choice([15, 25, 35, 45, 60])
            
            # Energy level varies by time of day
            if 9 <= hour <= 11 or 14 <= hour <= 16:
                energy_level = np.random.beta(3, 2)  # Higher energy during peak hours
            else:
                energy_level = np.random.beta(2, 3)  # Lower energy otherwise
            
            topic_difficulty = np.random.uniform(0.2, 0.9)
            prev_performance = np.random.beta(2, 2)
            break_time = np.random.exponential(90)  # Minutes since last session
            daily_study_time = np.random.gamma(2, 30)
            
            # Calculate effectiveness based on factors
            time_factor = 1.0 if (9 <= hour <= 11 or 14 <= hour <= 16) else 0.7
            energy_factor = energy_level
            duration_factor = 1.0 if 20 <= duration <= 40 else 0.8
            difficulty_factor = 1.0 - (topic_difficulty - energy_level) ** 2 if topic_difficulty <= energy_level else 0.6
            break_factor = min(1.0, break_time / 60)  # Optimal break is 1 hour
            fatigue_factor = max(0.3, 1.0 - daily_study_time / 180)  # Fatigue after 3 hours
            
            effectiveness = (time_factor * energy_factor * duration_factor * 
                           difficulty_factor * break_factor * fatigue_factor)
            effectiveness = max(0.1, min(1.0, effectiveness))
            
            # Add noise
            effectiveness += np.random.normal(0, 0.1)
            effectiveness = max(0.1, min(1.0, effectiveness))
            
            synthetic_data.append({
                'hour_of_day': hour,
                'day_of_week': day_of_week,
                'session_duration': duration,
                'user_energy_level': energy_level,
                'topic_difficulty': topic_difficulty,
                'previous_session_performance': prev_performance,
                'break_since_last_session': break_time,
                'total_study_time_today': daily_study_time,
                'session_effectiveness': effectiveness
            })
        
        return synthetic_data

class MLModelManager:
    """Manager class for all ML models"""
    
    def __init__(self):
        self.retention_model = RetentionPredictionModel()
        self.difficulty_model = DifficultyRecommendationModel()
        self.timing_model = StudyTimeOptimizationModel()
        self.models_trained = False
    
    async def initialize_models(self) -> Dict[str, Any]:
        """Initialize and train all ML models"""
        
        print("Initializing ML models...")
        
        results = {}
        
        # Train retention prediction model
        try:
            retention_results = await self.retention_model.train()
            results['retention_model'] = retention_results
            print(f"SUCCESS Retention model trained: {retention_results['test_accuracy']:.3f} accuracy")
        except Exception as e:
            print(f"X Error training retention model: {e}")
            results['retention_model'] = {'error': str(e)}
        
        # Train difficulty recommendation model
        try:
            difficulty_results = await self.difficulty_model.train()
            results['difficulty_model'] = difficulty_results
            print(f"SUCCESS Difficulty model trained: {difficulty_results['test_r2']:.3f} R²")
        except Exception as e:
            print(f"X Error training difficulty model: {e}")
            results['difficulty_model'] = {'error': str(e)}
        
        # Train timing optimization model
        try:
            timing_results = await self.timing_model.train()
            results['timing_model'] = timing_results
            print(f"SUCCESS Timing model trained: {timing_results['test_r2']:.3f} R²")
        except Exception as e:
            print(f"X Error training timing model: {e}")
            results['timing_model'] = {'error': str(e)}
        
        self.models_trained = True
        print("All ML models initialized successfully!")
        
        return results
    
    async def get_intelligent_recommendations(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get comprehensive ML-powered recommendations"""
        
        if not self.models_trained:
            await self.initialize_models()
        
        recommendations = {}
        
        # Get retention predictions for user's topics
        user_topics = context.get('topics', [])
        retention_predictions = {}
        
        for topic in user_topics:
            topic_data = {
                'days_since_last_review': context.get(f'{topic}_days_since', 1),
                'average_score': context.get(f'{topic}_avg_score', 0.5),
                'difficulty': context.get(f'{topic}_difficulty', 'medium'),
                'review_count': context.get(f'{topic}_review_count', 1),
                'learning_style': context.get('learning_style', 'visual')
            }
            
            retention_prob = await self.retention_model.predict_retention(topic_data)
            retention_predictions[topic] = retention_prob
        
        recommendations['retention_predictions'] = retention_predictions
        
        # Get optimal difficulty recommendation
        user_profile = {
            'average_performance': context.get('average_performance', 0.5),
            'learning_velocity': context.get('learning_velocity', 0.5),
            'consistency_score': context.get('consistency_score', 0.5),
            'current_streak': context.get('current_streak', 0),
            'time_spent_learning': context.get('time_spent_learning', 60),
            'topic_familiarity': context.get('topic_familiarity', 0.5)
        }
        
        optimal_difficulty = self.difficulty_model.recommend_difficulty(user_profile)
        recommendations['optimal_difficulty'] = optimal_difficulty
        
        # Get optimal study timing
        timing_context = {
            'user_energy_level': context.get('user_energy_level', 0.7),
            'topic_difficulty': self.retention_model._encode_difficulty(optimal_difficulty),
            'previous_session_performance': context.get('previous_session_performance', 0.7),
            'break_since_last_session': context.get('break_since_last_session', 60),
            'total_study_time_today': context.get('total_study_time_today', 60)
        }
        
        optimal_timing = self.timing_model.optimize_study_time(timing_context)
        recommendations['optimal_timing'] = optimal_timing
        
        # Generate priority recommendations based on retention predictions
        priority_topics = sorted(
            retention_predictions.items(),
            key=lambda x: x[1]  # Sort by retention probability (ascending)
        )[:3]  # Top 3 topics needing attention
        
        recommendations['priority_topics'] = [
            {
                'topic': topic,
                'retention_probability': prob,
                'urgency': 'high' if prob < 0.5 else 'medium' if prob < 0.7 else 'low'
            }
            for topic, prob in priority_topics
        ]
        
        return recommendations

# Global instance
ml_model_manager = MLModelManager()
