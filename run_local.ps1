#!/usr/bin/env powershell
# 🚀 AUTOTEST - FAST LOCAL RUN (Windows)

Write-Host @"
╔════════════════════════════════════════════════════════════╗
║          🚀 AUTOTEST - LOCAL DEVELOPMENT                  ║
║            Fast Setup & Run Script                        ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Step 1: Activate venv
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python not found! Install Python 3.11+" -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Step 1: Activating virtual environment..." -ForegroundColor Yellow

if (!(Test-Path ".\.venv")) {
    Write-Host "   Creating .venv..." -ForegroundColor Gray
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

& ".\.venv\Scripts\Activate.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

# Step 2: Install/Update dependencies
Write-Host "📦 Step 2: Installing dependencies..." -ForegroundColor Yellow
pip install -q --upgrade pip
pip install -q -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Dependency installation failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Check .env
Write-Host "📝 Step 3: Checking .env..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Write-Host "   Creating .env from .env.example..." -ForegroundColor Gray
    Copy-Item ".env.example" ".env"
    Write-Host "   ⚠️  Edit .env with your PostgreSQL credentials!" -ForegroundColor Magenta
}

# Step 4: Database check
Write-Host "`n🗄️  Database Setup (if needed):" -ForegroundColor Cyan
Write-Host "   1️⃣  Start PostgreSQL service" -ForegroundColor Gray
Write-Host "   2️⃣  Run: createdb autotest" -ForegroundColor Gray
Write-Host "   3️⃣  Run: alembic upgrade head" -ForegroundColor Gray

# Step 5: Ready
Write-Host "`n" -ForegroundColor Green
Write-Host @"
✅ Setup Complete! Ready to run:

📌 To start backend server:
   cd C:\Users\user\Desktop\Loyiha_003.1
   .\.venv\Scripts\Activate.ps1
   uvicorn main:app --reload --host 0.0.0.0 --port 8000

📌 API Docs (after server starts):
   http://localhost:8000/docs

📌 Health Check:
   curl http://localhost:8000/health

📌 Run Tests:
   pytest -v
"@ -ForegroundColor Green

Write-Host "`n💡 More info: Read LOCAL_RUN_GUIDE.md" -ForegroundColor Cyan
