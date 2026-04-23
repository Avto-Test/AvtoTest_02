# AUTOTEST Local Development Setup Script (Windows PowerShell)

Write-Host "🚀 AUTOTEST Local Development Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "✓ Checking Python..." -ForegroundColor Yellow
python --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check if .venv exists
if (!(Test-Path ".\.venv")) {
    Write-Host "✓ Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Virtual environment created" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

# Activate venv
Write-Host "✓ Activating virtual environment..." -ForegroundColor Yellow
& ".\.venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "✓ Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet

# Install dependencies
Write-Host "✓ Installing dependencies..." -ForegroundColor Yellow
if (Test-Path "requirements.txt") {
    pip install -r requirements.txt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️  requirements.txt not found" -ForegroundColor Yellow
}

# Check .env
if (!(Test-Path ".env")) {
    Write-Host "✓ Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Please update .env with your local configuration!" -ForegroundColor Magenta
}

# Database setup info
Write-Host ""
Write-Host "📝 Database Setup Instructions:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "1. PostgreSQL yugga o'rnatilgan bo'lishi kerak" -ForegroundColor White
Write-Host "2. Quyidagi command bilan database yarating:" -ForegroundColor White
Write-Host "   createdb autotest" -ForegroundColor Gray
Write-Host "3. Migrations o'tkazing:" -ForegroundColor White
Write-Host "   alembic upgrade head" -ForegroundColor Gray
Write-Host ""

# Ready to run
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Local Development Start Commands:" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "1. Activate venv (if not active):" -ForegroundColor White
Write-Host "   .\.venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run Alembic migrations:" -ForegroundColor White
Write-Host "   alembic upgrade head" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start backend server:" -ForegroundColor White
Write-Host "   uvicorn main:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Health check:" -ForegroundColor White
Write-Host "   curl http://localhost:8000/health" -ForegroundColor Gray
Write-Host ""
