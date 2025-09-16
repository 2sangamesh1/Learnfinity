"""
Intelligent Spaced Repetition Engine
Uses ML models to predict optimal review intervals based on user learning patterns
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import joblib
import os
from app.core.supabase_client import supabase_client

class IntelligentSpacedRepetition:
    """
    ML-powered spaced repetition that learns from user behavior
    """
    
    def __init__(self):
        self.supabase = supabase_client.get_client()
        self.models = {}
        self.scalers = {}
        self.model_path = "models/"
        os.makedirs(self.model_path, exist_ok=True)
        
        # Load or initialize models
        self.load_models()
    
    def load_models(self):
        """Load trained ML models"""
        try:
            # Load interval prediction model
            interval_model_path = os.path.join(self.model_path, "interval_predictor.pkl")
            if os.path.exists(interval_model_path):
                self.models['interval_predictor'] = joblib.load(interval_model_path)
            else:
                self.models['interval_predictor'] = RandomForestRegressor(n_estimators=100, random_state=42)
            
            # Load retention prediction model
            retention_model_path = os.path.join(self.model_path, "retention_predictor.pkl")
            if os.path.exists(retention_model_path):
                self.models['retention_predictor'] = joblib.load(retention_model_path)
            else:
                self.models['retention_predictor'] = RandomForestRegressor(n_estimators=100, random_state=42)
            
            # Load scalers
            scaler_path = os.path.join(self.model_path, "feature_scaler.pkl")
            if os.path.exists(scaler_path):
                self.scalers['feature_scaler'] = joblib.load(scaler_path)
            else:
                self.scalers['feature_scaler'] = StandardScaler()
            
            print("✅ Loaded ML models for spaced repetition")
            
        except Exception as e:
            print(f"X Error loading models: {e}")
            # Initialize with default models
            self.models['interval_predictor'] = RandomForestRegressor(n_estimators=100, random_state=42)
            self.models['retention_predictor'] = RandomForestRegressor(n_estimators=100, random_state=42)
            self.scalers['feature_scaler'] = StandardScaler()
    
    def save_models(self):
        """Save trained models to disk"""
        try:
            joblib.dump(self.models['interval_predictor'], 
                       os.path.join(self.model_path, "interval_predictor.pkl"))
            joblib.dump(self.models['retention_predictor'], 
                       os.path.join(self.model_path, "retention_predictor.pkl"))
            joblib.dump(self.scalers['feature_scaler'], 
                       os.path.join(self.model_path, "feature_scaler.pkl"))
            print("✅ Saved ML models")
        except Exception as e:
            print(f"X Error saving models: {e}")
    
    async def calculate_intelligent_interval(self, user_id: str, topic_name: str, 
                                           performance_score: float, difficulty: str) -> Dict:
        """
        Calculate optimal review interval using ML prediction
        """
        try:
            # Get user's learning profile and history
            user_profile = await self.get_user_profile(user_id)
            topic_history = await self.get_topic_history(user_id, topic_name)
            recent_analytics = await self.get_recent_analytics(user_id)
            
            # Prepare features for ML model
            features = self.prepare_features(
                user_profile, topic_history, recent_analytics, 
                performance_score, difficulty
            )
            
            # Predict optimal interval
            predicted_interval = self.predict_interval(features)
            
            # Apply business logic constraints
            final_interval = self.apply_interval_constraints(
                predicted_interval, topic_history, performance_score
            )
            
            # Calculate next review date
            next_review = datetime.now() + timedelta(days=final_interval)
            
            # Update spaced repetition data
            await self.update_spaced_repetition_data(
                user_id, topic_name, performance_score, difficulty, 
                final_interval, next_review
            )
            
            return {
                'interval_days': final_interval,
                'next_review': next_review.isoformat(),
                'confidence': self.calculate_confidence(features),
                'ml_prediction': predicted_interval,
                'features_used': features
            }
            
        except Exception as e:
            print(f"X Error calculating intelligent interval: {e}")
            # Fallback to basic SuperMemo 2
            return await self.fallback_supermemo2(user_id, topic_name, performance_score, difficulty)
    
    def prepare_features(self, user_profile: Dict, topic_history: List, 
                        recent_analytics: Dict, performance_score: float, 
                        difficulty: str) -> np.ndarray:
        """Prepare features for ML model"""
        
        # Basic features
        features = [
            performance_score / 100.0,  # Normalized score
            len(topic_history),  # Number of previous reviews
            self.get_difficulty_numeric(difficulty),  # Difficulty level
        ]
        
        # User profile features
        if user_profile:
            features.extend([
                user_profile.get('attention_span', 30) / 60.0,  # Normalized attention span
                self.get_learning_style_numeric(user_profile.get('learning_style', 'reading')),
                user_profile.get('retention_rate', 0.7),
                user_profile.get('difficulty_preference', 'medium') == difficulty,
            ])
        else:
            features.extend([0.5, 0.5, 0.7, 0.5])  # Default values
        
        # Topic history features
        if topic_history:
            recent_scores = [h['score'] for h in topic_history[-5:]]  # Last 5 scores
            features.extend([
                np.mean(recent_scores) / 100.0,  # Average recent performance
                np.std(recent_scores) / 100.0,   # Performance consistency
                len(recent_scores),              # Number of recent reviews
                (datetime.now() - datetime.fromisoformat(topic_history[-1]['timestamp'])).days,  # Days since last review
            ])
        else:
            features.extend([0.5, 0.0, 0, 0])
        
        # Analytics features
        if recent_analytics:
            features.extend([
                recent_analytics.get('learning_velocity', 0.5),
                recent_analytics.get('forgetting_patterns', {}).get('forgetting_rate', 0.1),
                recent_analytics.get('attention_span_analysis', {}).get('consistency', 0.5),
                recent_analytics.get('performance_trends', {}).get('improvement_rate', 0),
            ])
        else:
            features.extend([0.5, 0.1, 0.5, 0])
        
        return np.array(features).reshape(1, -1)
    
    def get_difficulty_numeric(self, difficulty: str) -> float:
        """Convert difficulty to numeric value"""
        difficulty_map = {'easy': 0.3, 'medium': 0.6, 'hard': 0.9}
        return difficulty_map.get(difficulty, 0.6)
    
    def get_learning_style_numeric(self, learning_style: str) -> float:
        """Convert learning style to numeric value"""
        style_map = {'visual': 0.8, 'auditory': 0.6, 'kinesthetic': 0.4, 'reading': 0.9}
        return style_map.get(learning_style, 0.7)
    
    def predict_interval(self, features: np.ndarray) -> float:
        """Predict optimal interval using ML model"""
        try:
            # Scale features
            scaled_features = self.scalers['feature_scaler'].transform(features)
            
            # Predict interval
            predicted_interval = self.models['interval_predictor'].predict(scaled_features)[0]
            
            # Ensure reasonable range
            return max(1, min(365, predicted_interval))
            
        except Exception as e:
            print(f"X Error in ML prediction: {e}")
            return 7.0  # Default fallback
    
    def apply_interval_constraints(self, predicted_interval: float, 
                                 topic_history: List, performance_score: float) -> int:
        """Apply business logic constraints to predicted interval"""
        
        # Base constraints
        min_interval = 1
        max_interval = 365
        
        # Adjust based on performance
        if performance_score >= 90:
            # Excellent performance - can increase interval
            predicted_interval *= 1.2
        elif performance_score >= 80:
            # Good performance - slight increase
            predicted_interval *= 1.1
        elif performance_score >= 60:
            # Average performance - keep as is
            pass
        else:
            # Poor performance - decrease interval
            predicted_interval *= 0.8
        
        # Adjust based on topic history
        if topic_history:
            recent_scores = [h['score'] for h in topic_history[-3:]]
            avg_recent = np.mean(recent_scores)
            
            if avg_recent > 85:
                predicted_interval *= 1.1
            elif avg_recent < 60:
                predicted_interval *= 0.9
        
        # Apply SuperMemo 2 logic for first few reviews
        if len(topic_history) == 0:
            return 1
        elif len(topic_history) == 1:
            return 6
        elif len(topic_history) < 5:
            # Use SuperMemo 2 for early reviews
            last_interval = topic_history[-1].get('interval_days', 1)
            ease_factor = topic_history[-1].get('ease_factor', 2.5)
            return max(1, int(last_interval * ease_factor))
        
        # Apply final constraints
        return int(max(min_interval, min(max_interval, predicted_interval)))
    
    def calculate_confidence(self, features: np.ndarray) -> float:
        """Calculate confidence in the prediction"""
        try:
            # Use model's feature importance or prediction variance
            if hasattr(self.models['interval_predictor'], 'feature_importances_'):
                # For Random Forest, use feature importance
                importance = self.models['interval_predictor'].feature_importances_
                confidence = min(0.95, 0.5 + np.mean(importance) * 2)
            else:
                # Default confidence based on number of features
                confidence = min(0.95, 0.6 + len(features[0]) * 0.02)
            
            return confidence
            
        except Exception as e:
            print(f"X Error calculating confidence: {e}")
            return 0.7  # Default confidence
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Get user's learning profile"""
        try:
            response = await self.supabase.table('learning_profiles')\
                .select('*')\
                .eq('user_id', user_id)\
                .single()
            return response.data
        except Exception as e:
            print(f"X Error getting user profile: {e}")
            return None
    
    async def get_topic_history(self, user_id: str, topic_name: str) -> List:
        """Get topic's review history"""
        try:
            response = await self.supabase.table('spaced_repetition_data')\
                .select('*')\
                .eq('user_id', user_id)\
                .eq('topic_name', topic_name)\
                .single()
            
            if response.data and 'performance_history' in response.data:
                return response.data['performance_history']
            return []
            
        except Exception as e:
            print(f"X Error getting topic history: {e}")
            return []
    
    async def get_recent_analytics(self, user_id: str) -> Optional[Dict]:
        """Get recent learning analytics"""
        try:
            response = await self.supabase.table('learning_analytics')\
                .select('analytics_data')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(1)\
                .single()
            
            return response.data.get('analytics_data') if response.data else None
            
        except Exception as e:
            print(f"X Error getting recent analytics: {e}")
            return None
    
    async def update_spaced_repetition_data(self, user_id: str, topic_name: str, 
                                          performance_score: float, difficulty: str,
                                          interval_days: int, next_review: datetime):
        """Update spaced repetition data in database"""
        try:
            # Get existing data
            existing_response = await self.supabase.table('spaced_repetition_data')\
                .select('*')\
                .eq('user_id', user_id)\
                .eq('topic_name', topic_name)\
                .single()
            
            # Prepare performance history
            performance_entry = {
                'score': performance_score,
                'difficulty': difficulty,
                'timestamp': datetime.now().isoformat(),
                'interval_used': interval_days
            }
            
            if existing_response.data:
                # Update existing record
                existing_history = existing_response.data.get('performance_history', [])
                existing_history.append(performance_entry)
                
                # Calculate new ease factor
                new_ease_factor = self.calculate_ease_factor(existing_history)
                
                await self.supabase.table('spaced_repetition_data')\
                    .update({
                        'interval_days': interval_days,
                        'repetitions': existing_response.data.get('repetitions', 0) + 1,
                        'ease_factor': new_ease_factor,
                        'last_review': datetime.now().isoformat(),
                        'next_review': next_review.isoformat(),
                        'performance_history': existing_history
                    })\
                    .eq('user_id', user_id)\
                    .eq('topic_name', topic_name)\
                    .execute()
            else:
                # Create new record
                await self.supabase.table('spaced_repetition_data')\
                    .insert([{
                        'user_id': user_id,
                        'topic_name': topic_name,
                        'interval_days': interval_days,
                        'repetitions': 1,
                        'ease_factor': 2.5,
                        'last_review': datetime.now().isoformat(),
                        'next_review': next_review.isoformat(),
                        'performance_history': [performance_entry]
                    }])\
                    .execute()
            
            print(f"✅ Updated spaced repetition data for {topic_name}")
            
        except Exception as e:
            print(f"X Error updating spaced repetition data: {e}")
    
    def calculate_ease_factor(self, performance_history: List) -> float:
        """Calculate ease factor based on performance history"""
        if len(performance_history) < 2:
            return 2.5
        
        # Use SuperMemo 2 ease factor calculation
        recent_scores = [p['score'] for p in performance_history[-5:]]  # Last 5 scores
        avg_score = np.mean(recent_scores)
        
        # Adjust ease factor based on performance
        if avg_score >= 90:
            return 2.8
        elif avg_score >= 80:
            return 2.6
        elif avg_score >= 70:
            return 2.4
        elif avg_score >= 60:
            return 2.2
        else:
            return 2.0
    
    async def fallback_supermemo2(self, user_id: str, topic_name: str, 
                                 performance_score: float, difficulty: str) -> Dict:
        """Fallback to SuperMemo 2 algorithm if ML fails"""
        try:
            # Get existing data
            existing_response = await self.supabase.table('spaced_repetition_data')\
                .select('*')\
                .eq('user_id', user_id)\
                .eq('topic_name', topic_name)\
                .single()
            
            if existing_response.data:
                # SuperMemo 2 calculation
                current_interval = existing_response.data.get('interval_days', 1)
                current_repetitions = existing_response.data.get('repetitions', 0)
                current_ease_factor = existing_response.data.get('ease_factor', 2.5)
                
                if performance_score >= 60:
                    if current_repetitions == 0:
                        new_interval = 1
                    elif current_repetitions == 1:
                        new_interval = 6
                    else:
                        new_interval = int(current_interval * current_ease_factor)
                    
                    new_repetitions = current_repetitions + 1
                    new_ease_factor = max(1.3, current_ease_factor + 
                                        (0.1 - (5 - performance_score/20) * 
                                         (0.08 + (5 - performance_score/20) * 0.02)))
                else:
                    new_interval = 1
                    new_repetitions = 0
                    new_ease_factor = max(1.3, current_ease_factor - 0.2)
            else:
                # First time
                new_interval = 1
                new_repetitions = 1
                new_ease_factor = 2.5
            
            next_review = datetime.now() + timedelta(days=new_interval)
            
            return {
                'interval_days': new_interval,
                'next_review': next_review.isoformat(),
                'confidence': 0.6,
                'ml_prediction': new_interval,
                'fallback': True
            }
            
        except Exception as e:
            print(f"X Error in SuperMemo 2 fallback: {e}")
            return {
                'interval_days': 7,
                'next_review': (datetime.now() + timedelta(days=7)).isoformat(),
                'confidence': 0.5,
                'ml_prediction': 7,
                'fallback': True
            }
    
    async def train_models(self, user_data: List[Dict]):
        """Train ML models with user data"""
        try:
            if not user_data:
                print("X No data available for training")
                return
            
            # Prepare training data
            X, y_intervals, y_retention = self.prepare_training_data(user_data)
            
            if len(X) < 10:
                print("X Insufficient data for training")
                return
            
            # Scale features
            X_scaled = self.scalers['feature_scaler'].fit_transform(X)
            
            # Train interval prediction model
            self.models['interval_predictor'].fit(X_scaled, y_intervals)
            
            # Train retention prediction model
            self.models['retention_predictor'].fit(X_scaled, y_retention)
            
            # Save models
            self.save_models()
            
            print(f"✅ Trained models with {len(X)} samples")
            
        except Exception as e:
            print(f"X Error training models: {e}")
    
    def prepare_training_data(self, user_data: List[Dict]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Prepare training data from user data"""
        X = []
        y_intervals = []
        y_retention = []
        
        for user in user_data:
            user_id = user['user_id']
            # This would need to be implemented to extract training examples
            # from the user's learning history
            pass
        
        return np.array(X), np.array(y_intervals), np.array(y_retention)
    
    async def get_topics_due_for_review(self, user_id: str) -> List[Dict]:
        """Get topics that are due for review using ML predictions"""
        try:
            # Get all spaced repetition data for user
            response = await self.supabase.table('spaced_repetition_data')\
                .select('*')\
                .eq('user_id', user_id)\
                .execute()
            
            due_topics = []
            user_profile = await self.get_user_profile(user_id)
            recent_analytics = await self.get_recent_analytics(user_id)
            
            for topic_data in response.data:
                # Calculate if topic is due for review
                is_due = await self.is_topic_due_for_review(
                    topic_data, user_profile, recent_analytics
                )
                
                if is_due['should_review']:
                    due_topics.append({
                        **topic_data,
                        'urgency': is_due['urgency'],
                        'confidence': is_due['confidence'],
                        'predicted_retention': is_due['predicted_retention'],
                        'ml_insights': is_due['ml_insights']
                    })
            
            # Sort by urgency and confidence
            due_topics.sort(key=lambda x: (
                {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}[x['urgency']],
                -x['confidence']
            ))
            
            return due_topics
            
        except Exception as e:
            print(f"X Error getting topics due for review: {e}")
            return []
    
    async def is_topic_due_for_review(self, topic_data: Dict, user_profile: Dict, 
                                    recent_analytics: Dict) -> Dict:
        """Determine if a topic is due for review using ML prediction"""
        try:
            # Get topic history
            topic_history = topic_data.get('performance_history', [])
            
            if not topic_history:
                return {
                    'should_review': True,
                    'urgency': 'HIGH',
                    'confidence': 0.8,
                    'predicted_retention': 0.5,
                    'ml_insights': ['First review needed']
                }
            
            # Prepare features for retention prediction
            features = self.prepare_features(
                user_profile, topic_history, recent_analytics,
                topic_history[-1]['score'], topic_data.get('difficulty', 'medium')
            )
            
            # Predict retention probability
            retention_prob = self.predict_retention(features)
            
            # Calculate days since last review
            last_review = datetime.fromisoformat(topic_data.get('last_review', datetime.now().isoformat()))
            days_since = (datetime.now() - last_review).days
            
            # Determine if review is needed
            should_review = retention_prob < 0.7 or days_since > topic_data.get('interval_days', 7)
            
            # Calculate urgency
            if retention_prob < 0.3:
                urgency = 'CRITICAL'
            elif retention_prob < 0.5:
                urgency = 'HIGH'
            elif retention_prob < 0.7:
                urgency = 'MEDIUM'
            else:
                urgency = 'LOW'
            
            # Generate ML insights
            insights = self.generate_ml_insights(topic_data, retention_prob, days_since)
            
            return {
                'should_review': should_review,
                'urgency': urgency,
                'confidence': self.calculate_confidence(features),
                'predicted_retention': retention_prob,
                'ml_insights': insights
            }
            
        except Exception as e:
            print(f"X Error checking if topic is due: {e}")
            return {
                'should_review': True,
                'urgency': 'MEDIUM',
                'confidence': 0.5,
                'predicted_retention': 0.5,
                'ml_insights': ['Error in prediction']
            }
    
    def predict_retention(self, features: np.ndarray) -> float:
        """Predict retention probability using ML model"""
        try:
            scaled_features = self.scalers['feature_scaler'].transform(features)
            retention_prob = self.models['retention_predictor'].predict(scaled_features)[0]
            return max(0, min(1, retention_prob))
        except Exception as e:
            print(f"X Error predicting retention: {e}")
            return 0.5
    
    def generate_ml_insights(self, topic_data: Dict, retention_prob: float, 
                           days_since: int) -> List[str]:
        """Generate ML-based insights for the topic"""
        insights = []
        
        if retention_prob < 0.3:
            insights.append("High risk of forgetting - immediate review needed")
        elif retention_prob < 0.5:
            insights.append("Memory is fading - review soon")
        
        if days_since > topic_data.get('interval_days', 7) * 1.5:
            insights.append("Overdue for review based on your learning pattern")
        
        if topic_data.get('repetitions', 0) < 3:
            insights.append("Early learning stage - frequent reviews recommended")
        
        if retention_prob > 0.8:
            insights.append("Strong retention - can extend review interval")
        
        return insights
