# 🎯 AUTOTEST Local Development Complete Setup

## ✅ Cleanup & Setup Summary

### What Was Cleaned
```
✓ Removed __pycache__ directories          → Repository size reduced
✓ Removed .pytest_cache                    → Clean test environment  
✓ Removed DEMO_DATA.md                     → Unnecessary demo docs
✓ Removed RISK_POINTS.md                   → Archived risk analysis
✓ Git cache updated                        → Ready for fresh deployment
```

### What Was Created
```
✓ .env.example                             → Configuration template
✓ setup_local.ps1                          → Initial environment setup
✓ run_local.ps1                            → Fast start script
✓ LOCAL_RUN_GUIDE.md                       → Detailed development guide
✓ CLEANUP_CHECKLIST.md                     → This checklist
```

### Files Preserved (Essential)
```
✓ README.md                                → Main documentation
✓ PROJECT_STATUS.md                        → Progress tracking
✓ PROJECT_CONTEXT.md                       → Project info
✓ ROADMAP.md                               → Strategic planning
✓ All source code                          → Untouched
```

---

## 🚀 Quick Start (Windows PowerShell)

### Option 1: Auto Setup (Recommended)
```powershell
# Run the fast setup script
.\run_local.ps1

# Or detailed setup
.\setup_local.ps1
```

### Option 2: Manual Setup
```powershell
# 1. Create virtual environment
python -m venv .venv

# 2. Activate virtual environment
.\.venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create .env (if not exists)
Copy-Item ".env.example" ".env"

# 5. Setup PostgreSQL (in separate terminal)
createdb autotest
alembic upgrade head

# 6. Start backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 📋 System Requirements

- **Python 3.11+** 
- **PostgreSQL 14+** running
- **pip** package manager

### Check Prerequisites
```powershell
python --version          # Should be 3.11+
psql --version           # Should show PostgreSQL version
```

---

## 🗄️ Database Setup

```powershell
# Create database
createdb autotest

# Apply migrations
alembic upgrade head

# Verify connection
psql autotest -c "SELECT version();"
```

---

## 🎮 Running the Backend

```powershell
# Activate venv
.\.venv\Scripts\Activate.ps1

# Start server with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server will be available at:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **API Root**: http://localhost:8000/

---

## 🧪 Running Tests

```powershell
# Activate venv
.\.venv\Scripts\Activate.ps1

# Run all tests
pytest -v

# Run with coverage
pytest --cov=api --cov=services tests/

# Run specific test file
pytest tests/test_auth.py -v
```

---

## 📝 Common Development Tasks

### Install New Package
```powershell
pip install package-name
pip freeze > requirements.txt
```

### Create Database Migration
```powershell
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

### Reset Database (Development Only)
```powershell
alembic downgrade base
alembic upgrade head
```

### Check Git Status Before Commit
```powershell
git status
git diff                 # Review changes
git add .
git commit -m "feat: description"
```

---

## ⚠️ Troubleshooting

### PostgreSQL Connection Error
```
ERROR: could not connect to server: Connection refused
```
**Fix**: 
- Windows: Start PostgreSQL service from Services
- Verify DATABASE_URL in .env matches your setup

### Module Import Errors
```
ModuleNotFoundError: No module named 'fastapi'
```
**Fix**:
```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt --force-reinstall
```

### Port 8000 Already in Use
```powershell
# Use different port
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### Migration Conflicts
```powershell
# Check current migration
alembic current

# Reset to base
alembic downgrade base

# Reapply all
alembic upgrade head
```

---

## 📚 Project Structure

```
Loyiha_003.1/
├── main.py                    # FastAPI entry point
├── requirements.txt           # Python dependencies
├── .env.example              # Config template
├── alembic/                  # Database migrations
│   ├── versions/             # Migration files
│   └── env.py
├── api/                      # API routers
│   ├── auth/                 # Authentication
│   ├── users/                # User management
│   ├── tests/                # Test operations
│   ├── attempts/             # Test attempts
│   └── ...                   # Other modules
├── core/                     # Core utilities
│   ├── config.py            # Configuration
│   ├── security.py          # Auth & RBAC
│   ├── errors.py            # Exception handling
│   └── ...
├── database/                # Database layer
│   ├── base.py             # SQLAlchemy setup
│   ├── session.py          # Database session
│   └── ...
├── models/                  # SQLAlchemy models
├── services/                # Business logic
├── ml/                      # Machine learning
├── tests/                   # Unit tests
└── docs/                    # Documentation
```

---

## 🔐 Environment Variables

Key variables in `.env`:

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql+asyncpg://user:pass@localhost:5432/autotest` |
| `SECRET_KEY` | JWT signing key | `your-secret-key` |
| `DEBUG` | Debug mode | `true` (dev), `false` (prod) |
| `LOG_LEVEL` | Logging verbosity | `INFO`, `DEBUG`, `WARNING` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:3000` |

---

## 🎯 Next Steps

1. ✅ **Setup Complete** - You've cleaned the project
2. 📖 **Read Docs** - Check `LOCAL_RUN_GUIDE.md` for detailed info
3. 🏃 **Run Locally** - Execute `.\run_local.ps1`
4. 🌐 **Start Frontend** - If needed, setup frontend (separate)
5. 🧪 **Run Tests** - Verify everything works: `pytest -v`
6. 📝 **Start Coding** - Make your changes and commit!

---

## 📞 Support

For issues or questions:
- Check `LOCAL_RUN_GUIDE.md` for detailed setup guide
- Review `PROJECT_STATUS.md` for current phase info
- See `ROADMAP.md` for project direction
- Check `docs/ARCHITECTURE.md` for system design

---

**Happy coding! 🚀**
