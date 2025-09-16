"""
Supabase client configuration for Python backend
"""

import os
from supabase import create_client, Client, ClientOptions # UPDATED: Import ClientOptions
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import json
from fastapi import HTTPException

# Load environment variables
load_dotenv()

class SupabaseClient:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "").strip('"')
        self.key = os.getenv("SUPABASE_ANON_KEY", "").strip('"')
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY", "").strip('"')
        
        if not self.url or not self.key:
            print(f"Warning: Missing Supabase credentials. URL: {bool(self.url)}, Key: {bool(self.key)}")
            self.client = None
        else:
            try:
                # UPDATED: Use ClientOptions for initialization
                # The library handles authentication headers automatically, so they are not needed here.
                options = ClientOptions(
                    auto_refresh_token=True,
                    persist_session=True,
                )
                self.client: Client = create_client(
                    self.url,
                    self.key,
                    options=options
                )
                print("✅ Successfully connected to Supabase")
            except Exception as e:
                print(f"❌ Error initializing Supabase client: {str(e)}")
                self.client = None
    
    def get_client(self) -> Client:
        if not self.client:
            raise HTTPException(
                status_code=500,
                detail="Supabase client not initialized. Check your credentials."
            )
        return self.client
        
    async def execute_query(self, table: str, method: str = 'select', query_params: Dict[str, Any] = None, **kwargs):
        """Helper method to execute Supabase queries with error handling"""
        try:
            if not self.client:
                return {"data": None, "error": "Supabase client not initialized"}
                
            table_ref = self.client.table(table)
            
            # Handle different query methods
            if method == 'select':
                query = table_ref.select('*')
                if query_params:
                    for key, value in query_params.items():
                        if key.startswith('eq.'):
                            col = key[3:]  # remove 'eq.' prefix
                            query = query.eq(col, value)
                result = query.execute()
                return result.data
                
            elif method == 'insert':
                result = table_ref.insert(kwargs.get('data', {})).execute()
                return result.data[0] if result.data else None
                
            elif method == 'update':
                query = table_ref.update(kwargs.get('data', {}))
                if query_params:
                    for key, value in query_params.items():
                        if key.startswith('eq.'):
                            col = key[3:]
                            query = query.eq(col, value)
                result = query.execute()
                return result.data[0] if result.data else None
                
            return {"data": None, "error": "Invalid method"}
            
        except Exception as e:
            print(f"Supabase query error: {str(e)}")
            return {"data": None, "error": str(e)}

# Global instance
supabase_client = SupabaseClient()