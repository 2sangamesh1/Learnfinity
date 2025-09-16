# Learnfinity Unified Backend Architecture

## Overview
Learnfinity now uses a **hybrid backend architecture** that combines the strengths of both Node.js and Python FastAPI:

- **Node.js Backend (Port 3001)**: Main API gateway, handles basic operations, quiz generation, and authentication
- **FastAPI Backend (Port 8000)**: Advanced ML operations, spaced repetition engine, and analytics

## Architecture Diagram

```
Frontend (React) 
    ↓ (All API calls to port 3001)
Node.js API Gateway (Port 3001)
    ├── Basic Operations (CRUD, Auth, Quiz Generation)
    └── ML Operations → FastAPI Backend (Port 8000)
                           ├── Spaced Repetition Engine
                           ├── ML Analytics
                           └── Study Plan Generation
```

## API Endpoints

### Node.js Backend (localhost:3001)
- `POST /api/generate-quiz` - Quiz generation (with FastAPI fallback)
- `POST /api/generateExplanation` - AI explanations (with FastAPI fallback)
- `POST /api/spaced-repetition/update` - Updates spaced repetition (proxies to FastAPI)
- `GET /api/spaced-repetition/reviews/:userId` - Gets due reviews (proxies to FastAPI)
- `POST /api/learning-profile/create` - Creates learning profiles
- `GET /api/learning-profile/:userId` - Gets learning profiles
- `POST /api/learning-analytics/generate` - Generates analytics
- `POST /api/generate-initial-plan` - Generates study plans

### FastAPI Backend (localhost:8000)
- `POST /api/v1/smart-scheduler/spaced-repetition/update` - ML-powered spaced repetition
- `GET /api/v1/smart-scheduler/spaced-repetition/reviews/{user_id}` - ML review predictions
- `GET /api/v1/smart-scheduler/spaced-repetition/recommendations/{user_id}` - Study recommendations
- `POST /ml/generate-quiz` - Advanced quiz generation
- `POST /ml/generate-explanation` - Advanced explanations
- `POST /ml/learning-analytics` - Advanced analytics

## How It Works

1. **Frontend** makes all API calls to Node.js backend (port 3001)
2. **Node.js backend** handles:
   - Basic CRUD operations
   - Authentication and user management
   - Quiz generation using Gemini AI
   - Study plan generation
3. **For ML operations**, Node.js proxies requests to FastAPI backend:
   - Spaced repetition calculations
   - Advanced analytics
   - ML-powered predictions
4. **FastAPI backend** provides:
   - Sophisticated spaced repetition engine
   - Machine learning algorithms
   - Advanced study analytics

## Benefits

✅ **Unified API**: Frontend only needs to connect to one endpoint (port 3001)
✅ **Best of Both Worlds**: Node.js for rapid development, Python for ML
✅ **Graceful Fallbacks**: If FastAPI is down, Node.js provides basic functionality
✅ **Scalable**: Each service can be scaled independently
✅ **Maintainable**: Clear separation of concerns

## Starting the Backend

### Option 1: Use the startup scripts
```bash
# Windows Batch
./start-unified-backend.bat

# PowerShell
./start-unified-backend.ps1
```

### Option 2: Manual startup
```bash
# Terminal 1: Start FastAPI Backend
cd python-backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start Node.js Backend  
cd backend
npm run dev
```

## Environment Configuration

### backend/.env
```env
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
PYTHON_ML_URL=http://127.0.0.1:8000
PORT=3001
NODE_ENV=development
```

### python-backend/.env
```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
OPENAI_API_KEY=your_openai_api_key_here
NODE_BACKEND_URL=http://127.0.0.1:3001
```

## Frontend Integration

The frontend should continue using the same API endpoints but now they're powered by the hybrid architecture:

```javascript
// All API calls go to Node.js backend (port 3001)
const API_BASE = 'http://localhost:3001/api';

// Spaced repetition (now ML-powered via FastAPI)
fetch(`${API_BASE}/spaced-repetition/update`, { ... });
fetch(`${API_BASE}/spaced-repetition/reviews/${userId}`);

// Quiz generation (Gemini with FastAPI fallback)
fetch(`${API_BASE}/generate-quiz`, { ... });
```

## Status

✅ **Completed**:
- Hybrid architecture design
- API gateway setup in Node.js
- FastAPI integration for ML operations
- Integration testing

🔄 **Next Steps**:
- Monitor performance and scalability
- Add proper error handling
- Implement authentication between services
