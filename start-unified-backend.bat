@echo off
echo Starting Learnfinity Unified Backend Architecture...
echo.

echo [1/2] Starting FastAPI Backend (Python ML Service) on port 8001...
start "FastAPI Backend" cmd /k "cd /d python-backend && python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

echo [2/2] Starting Node.js Backend (API Gateway) on port 3001...
start "Node.js Backend" cmd /k "cd /d backend && npm run dev"

echo.
echo ✅ Both backends are starting up!
echo ✅ Node.js API Gateway: http://localhost:3001
echo ✅ FastAPI ML Service: http://localhost:8001
echo ✅ Frontend should connect to: http://localhost:3001
echo.
pause
