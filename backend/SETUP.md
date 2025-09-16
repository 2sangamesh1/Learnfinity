# Backend Setup Instructions

## Environment Variables Required

Create a `.env` file in the backend directory with the following variables:

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# Server Configuration
PORT=3001
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your API keys

3. Start the server:
```bash
npm start
```

## New API Endpoints Added

### ML Tables Endpoints:
- `POST /api/learning-profile/create` - Create learning profile
- `GET /api/learning-profile/:userId` - Get learning profile
- `POST /api/spaced-repetition/update` - Update spaced repetition data
- `GET /api/spaced-repetition/reviews/:userId` - Get topics for review
- `POST /api/learning-analytics/generate` - Generate learning analytics
- `GET /api/ml-models/performance` - Get ML model performance

### Enhanced Existing Endpoints:
- `POST /api/smart-recommendations` - Now uses ML data for better recommendations
- All existing endpoints remain the same

## Database Tables Used

The backend now connects to these Supabase tables:
- `learning_profiles`
- `spaced_repetition_data`
- `learning_analytics`
- `ml_model_performance`
- `quiz_results` (existing)
- `study_sessions` (existing)



