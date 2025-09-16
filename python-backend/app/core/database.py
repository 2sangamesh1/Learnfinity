"""
Database configuration using Supabase
"""

from app.core.supabase_client import supabase_client
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
from fastapi import HTTPException

class DatabaseService:
    def __init__(self):
        self.client = supabase_client
        if not self.client.get_client():
            print("Warning: Supabase client not initialized, using mock mode")
    
    # Learning Profiles
    async def create_learning_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a learning profile for a user"""
        try:
            profile_data.update({
                'user_id': user_id,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            })
            
            result = await self.client.execute_query(
                'learning_profiles',
                'insert',
                data=profile_data
            )
            
            if 'error' in result:
                raise HTTPException(status_code=500, detail=result['error'])
                
            return result
        except Exception as e:
            print(f"Error creating learning profile: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_learning_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get learning profile for a user"""
        try:
            result = await self.client.execute_query(
                'learning_profiles',
                'select',
                query_params={'eq.user_id': user_id}
            )
            
            if isinstance(result, dict) and 'error' in result:
                raise HTTPException(status_code=500, detail=result['error'])
                
            return result[0] if result else None
            
        except Exception as e:
            print(f"Error getting learning profile: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def update_learning_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update learning profile for a user"""
        try:
            profile_data['updated_at'] = datetime.now().isoformat()
            
            result = await self.client.execute_query(
                'learning_profiles',
                'update',
                query_params={'eq.user_id': user_id},
                data=profile_data
            )
            
            if 'error' in result:
                raise HTTPException(status_code=500, detail=result['error'])
                
            return result
            
        except Exception as e:
            print(f"Error updating learning profile: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # Spaced Repetition Data
    async def create_spaced_repetition_data(self, user_id: str, topic_name: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create spaced repetition data for a topic"""
        try:
            data.update({
                'user_id': user_id,
                'topic_name': topic_name,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            })
            
            result = await self.client.execute_query(
                'spaced_repetition_data',
                'insert',
                data=data
            )
            
            if 'error' in result:
                raise HTTPException(status_code=500, detail=result['error'])
                
            return result
            
        except Exception as e:
            print(f"Error creating spaced repetition data: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def get_spaced_repetition_data(self, user_id: str, topic_name: str) -> Optional[Dict[str, Any]]:
        """Get spaced repetition data for a topic"""
        try:
            result = await self.client.execute_query(
                'spaced_repetition_data',
                'select',
                query_params={
                    'eq.user_id': user_id,
                    'eq.topic_name': topic_name
                }
            )
            
            if isinstance(result, dict) and 'error' in result:
                raise HTTPException(status_code=500, detail=result['error'])
                
            return result[0] if result else None
            
        except Exception as e:
            print(f"Error getting spaced repetition data: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def update_spaced_repetition_data(self, user_id: str, topic_name: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update spaced repetition data for a topic"""
        try:
            data['updated_at'] = datetime.now().isoformat()
            
            result = await self.client.execute_query(
                'spaced_repetition_data',
                'update',
                query_params={
                    'eq.user_id': user_id,
                    'eq.topic_name': topic_name
                },
                data=data
            )
            
            if 'error' in result:
                raise HTTPException(status_code=500, detail=result['error'])
                
            return result
            
        except Exception as e:
            print(f"Error updating spaced repetition data: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def upsert_spaced_repetition_data(self, user_id: str, topic_name: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Upsert spaced repetition data for a topic"""
        try:
            data.update({
                'user_id': user_id,
                'topic_name': topic_name,
                'updated_at': datetime.now().isoformat()
            })
            
            # First try to update
            result = await self.client.execute_query(
                'spaced_repetition_data',
                'update',
                query_params={
                    'eq.user_id': user_id,
                    'eq.topic_name': topic_name
                },
                data=data
            )
            
            # If no rows were updated, insert new
            if not result or (isinstance(result, dict) and 'error' in result):
                result = await self.client.execute_query(
                    'spaced_repetition_data',
                    'insert',
                    data=data
                )
            
            if 'error' in result:
                raise HTTPException(status_code=500, detail=result['error'])
                
            return result[0] if isinstance(result, list) and len(result) > 0 else result
            
        except Exception as e:
            print(f"Error upserting spaced repetition data: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # Learning Analytics
    async def create_learning_analytics(self, user_id: str, analytics_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create learning analytics for a user"""
        try:
            data = {
                'user_id': user_id,
                'analytics_data': json.dumps(analytics_data) if isinstance(analytics_data, dict) else analytics_data,
                'generated_at': datetime.now().isoformat()
            }
            
            result = await self.client.execute_query(
                'learning_analytics',
                'insert',
                data=data
            )
            
            if 'error' in result:
                raise HTTPException(status_code=500, detail=result['error'])
                
            return result
            
        except Exception as e:
            print(f"Error creating learning analytics: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_learning_analytics(self, user_id: str) -> List[Dict[str, Any]]:
        """Get learning analytics for a user"""
        try:
            result = await self.client.execute_query(
                'learning_analytics',
                'select',
                query_params={
                    'eq.user_id': user_id,
                    'order': 'generated_at.desc'
                }
            )
            
            if isinstance(result, dict) and 'error' in result:
                raise HTTPException(status_code=500, detail=result['error'])
                
            # Parse JSON strings back to Python objects
            for item in result:
                if isinstance(item.get('analytics_data'), str):
                    try:
                        item['analytics_data'] = json.loads(item['analytics_data'])
                    except json.JSONDecodeError:
                        pass
                        
            return result if result else []
            
        except Exception as e:
            print(f"Error getting learning analytics: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ML Model Performance
    async def create_ml_model_performance(self, model_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create ML model performance record"""
        try:
            model_data['created_at'] = datetime.now().isoformat()
            
            result = await self.client.execute_query(
                'ml_model_performance',
                'insert',
                data=model_data
            )
            
            if 'error' in result:
                raise HTTPException(status_code=500, detail=result['error'])
                
            return result
            
        except Exception as e:
            print(f"Error creating ML model performance: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_ml_model_performance(self, model_name: str = None) -> List[Dict[str, Any]]:
        """Get ML model performance records"""
        try:
            query_params = {
                'order': 'created_at.desc'
            }
            
            if model_name:
                query_params['eq.model_name'] = model_name
            
            result = await self.client.execute_query(
                'ml_model_performance',
                'select',
                query_params=query_params
            )
            
            if isinstance(result, dict) and 'error' in result:
                raise HTTPException(status_code=500, detail=result['error'])
                
            return result if result else []
            
        except Exception as e:
            print(f"Error getting ML model performance: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# Global database service instance
db_service = DatabaseService()



