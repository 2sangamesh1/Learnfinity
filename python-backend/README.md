# Learnfinity Smart Backend

AI-powered study planner with machine learning capabilities that continuously learns from user behavior and provides personalized study recommendations.

## Features

### 🧠 Machine Learning & AI
- **Synthetic Data Generation**: Creates diverse learning patterns for model training
- **Continuous Learning**: Models improve with real user data
- **Performance Prediction**: ML models predict quiz performance
- **Spaced Repetition**: AI-optimized review scheduling
- **Learning Style Detection**: Automatically identifies user learning preferences

### 📊 Smart Analytics
- **Learning Pattern Analysis**: Identifies study habits and preferences
- **Performance Tracking**: Comprehensive progress monitoring
- **Predictive Insights**: Forecasts learning outcomes
- **Personalized Recommendations**: AI-generated study advice

### 🎯 Adaptive Features
- **Dynamic Difficulty**: Adjusts quiz difficulty based on performance
- **Optimal Scheduling**: Recommends best study times and durations
- **Retention Optimization**: Maximizes long-term knowledge retention
- **Progress Optimization**: Identifies and addresses learning gaps

## Tech Stack

- **Backend**: Python 3.8+ with FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **ML/AI**: scikit-learn, OpenAI GPT-3.5-turbo
- **Data Processing**: pandas, numpy
- **Caching**: Redis
- **Background Tasks**: Celery

## Quick Start

### 1. Prerequisites
```bash
# Install Python 3.8+
# Install PostgreSQL
# Install Redis
```

### 2. Installation
```bash
# Clone the repository
cd python-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration
```bash
# Copy environment file
cp env.example .env

# Edit .env with your configuration
# - Set DATABASE_URL
# - Set OPENAI_API_KEY
# - Configure other settings
```

### 4. Database Setup
```bash
# Create database
createdb learnfinity

# Run migrations (if using Alembic)
alembic upgrade head
```

### 5. Run the Application
```bash
# Start the server
python main.py

# Or with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Smart Scheduler
- `POST /api/v1/smart/recommendations` - Get AI-powered study recommendations
- `POST /api/v1/smart/spaced-repetition/update` - Update spaced repetition data
- `POST /api/v1/smart/study-plan/generate` - Generate personalized study plan

### Quiz Generation
- `POST /api/v1/quiz/generate` - Generate AI-powered quizzes
- `POST /api/v1/quiz/explanation` - Get personalized explanations

### Analytics
- `POST /api/v1/analytics/learning-analytics` - Get comprehensive learning analytics
- `GET /api/v1/analytics/performance-prediction/{user_id}` - Get performance predictions
- `GET /api/v1/analytics/learning-style-analysis/{user_id}` - Analyze learning style

## Machine Learning Models

### 1. Performance Predictor
- **Purpose**: Predicts quiz performance based on user characteristics
- **Features**: Learning style, attention span, retention rate, study patterns
- **Algorithm**: Gradient Boosting Regressor

### 2. Optimal Interval Predictor
- **Purpose**: Determines optimal spaced repetition intervals
- **Features**: Performance history, forgetting probability, learning rate
- **Algorithm**: Random Forest Regressor

### 3. Learning Style Classifier
- **Purpose**: Identifies user learning style from behavior
- **Features**: Study patterns, quiz performance, session characteristics
- **Algorithm**: Random Forest Classifier

### 4. Difficulty Recommender
- **Purpose**: Recommends optimal difficulty levels
- **Features**: Performance history, learning style, attention span
- **Algorithm**: Random Forest Regressor

### 5. Retention Predictor
- **Purpose**: Predicts knowledge retention rates
- **Features**: Study frequency, performance consistency, learning style
- **Algorithm**: Gradient Boosting Regressor

## Data Collection & Learning

### Synthetic Data Generation
The system generates diverse synthetic datasets representing different learning styles:
- **Visual Learners**: Long attention spans, high retention rates
- **Auditory Learners**: Medium attention spans, moderate retention
- **Kinesthetic Learners**: Short attention spans, hands-on learning
- **Reading Learners**: Very long attention spans, highest retention

### Continuous Learning
- **Real-time Data Collection**: Monitors user behavior patterns
- **Model Retraining**: Automatically retrains models with new data
- **Performance Monitoring**: Tracks model accuracy and improvements
- **Anomaly Detection**: Identifies unusual learning patterns

## Integration with Frontend

The Python backend is designed to work seamlessly with your existing React frontend:

### API Compatibility
- All endpoints return JSON responses
- CORS configured for frontend domains
- Error handling with proper HTTP status codes
- Request/response validation with Pydantic

### Data Flow
1. **Frontend** sends user actions (quiz completion, study sessions)
2. **Backend** processes data and updates ML models
3. **ML Service** generates personalized recommendations
4. **Frontend** displays smart insights and recommendations

## Development

### Project Structure
```
python-backend/
├── app/
│   ├── api/v1/endpoints/     # API endpoints
│   ├── core/                 # Configuration and database
│   └── services/             # ML and data services
├── main.py                   # FastAPI application
├── requirements.txt          # Dependencies
└── README.md
```

### Adding New Features
1. Create new endpoint in `app/api/v1/endpoints/`
2. Add ML model in `app/services/ml_service.py`
3. Update data collection in `app/services/data_collector.py`
4. Test with synthetic data

### Model Training
```python
# Train models with new data
from app.services.ml_service import MLService
ml_service = MLService()
await ml_service.initialize_models()
```

## Monitoring & Analytics

### Model Performance
- Track accuracy, precision, recall for each model
- Monitor prediction confidence levels
- Analyze model drift and retraining needs

### User Analytics
- Learning pattern analysis
- Performance trend tracking
- Engagement metrics
- Retention analysis

## Deployment

### Production Setup
1. Use production database (PostgreSQL)
2. Configure Redis for caching
3. Set up Celery for background tasks
4. Use environment variables for configuration
5. Enable logging and monitoring

### Docker Support
```dockerfile
FROM python:3.8-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

**Note**: This backend is designed to work with the existing React frontend. The frontend remains unchanged while gaining powerful AI/ML capabilities through the Python backend.



