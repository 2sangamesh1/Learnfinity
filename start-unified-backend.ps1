Write-Host "Starting Learnfinity Unified Backend Architecture..." -ForegroundColor Green
Write-Host ""

Write-Host "[1/2] Starting FastAPI Backend (Python ML Service) on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'python-backend'; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Node.js Backend (API Gateway) on port 3001..." -ForegroundColor Yellow  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'backend'; npm run dev"

Write-Host ""
Write-Host "✅ Both backends are starting up!" -ForegroundColor Green
Write-Host "✅ Node.js API Gateway: http://localhost:3001" -ForegroundColor Cyan
Write-Host "✅ FastAPI ML Service: http://localhost:8000" -ForegroundColor Cyan
Write-Host "✅ Frontend should connect to: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
