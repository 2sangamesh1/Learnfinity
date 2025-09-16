"""
Synthetic Data Generator for Learnfinity
"""

import numpy as np
import random
from datetime import datetime, timedelta
from app.core.supabase_client import supabase_client

class SyntheticDataGenerator:
    def __init__(self):
        self.supabase = supabase_client.get_client()
    
    async def generate_synthetic_datasets(self, num_users: int = 50):
        print("Generating synthetic user profiles...")
        try:
            # Skip synthetic data generation to avoid database issues
            print("Skipping synthetic data generation - using mock data for ML training")
        except Exception as e:
            print(f"Error: {e}")
    
    async def generate_user_profiles(self, num_users: int):
        profiles = []
        for i in range(num_users):
            profiles.append({
                'user_id': f'00000000-0000-0000-0000-{i:012d}',
                'learning_style': random.choice(['visual', 'auditory', 'kinesthetic', 'reading']),
                'attention_span': random.randint(20, 90),
                'difficulty_preference': random.choice(['easy', 'medium', 'hard']),
                'retention_rate': random.uniform(0.5, 0.9),
                'created_at': datetime.now().isoformat()
            })
        await self.supabase.table('learning_profiles').insert(profiles).execute()
        print(f"✅ Generated {len(profiles)} user profiles")
    
    async def generate_quiz_results(self, num_users: int):
        quiz_results = []
        for user_id in range(num_users):
            for quiz_num in range(random.randint(10, 30)):
                days_ago = random.randint(0, 60)
                quiz_date = datetime.now() - timedelta(days=days_ago)
                base_score = 50 + (quiz_num * 2) + random.uniform(-10, 10)
                score = max(20, min(95, base_score))
                
                quiz_results.append({
                    'user_id': f'synthetic_user_{user_id}',
                    'topic_name': f"Subject - Topic {quiz_num}",
                    'score': int(score),
                    'difficulty': random.choice(['easy', 'medium', 'hard']),
                    'quiz_timestamp': quiz_date.isoformat()
                })
        
        batch_size = 500
        for i in range(0, len(quiz_results), batch_size):
            await self.supabase.table('quiz_results').insert(quiz_results[i:i + batch_size]).execute()
        print(f"✅ Generated {len(quiz_results)} quiz results")