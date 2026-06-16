# 🚀 AUTOTEST - Local Development Guide

## Prerequisites

- **Python 3.11+** installed
- **PostgreSQL 14+** installed and running
- **Git** for version control

## Quick Start

### 1. Setup Development Environment

```powershell
# Run setup script (Windows)
.\setup_local.ps1

# Or manual setup
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb autotest

# Run migrations
alembic upgrade head

# Verify connection
psql autotest -c "SELECT version();"
```

### 3. Environment Configuration

```bash
# Copy example to .env (if not done automatically)
cp .env.example .env

# Edit .env with your local PostgreSQL credentials
# Default:
DATABASE_URL=postgresql+asyncpg://postgres:79845209@localhost:5432/autotest
```

### 4. Start Backend Server

```bash
# Activate venv
.\.venv\Scripts\Activate.ps1

# Start uvicorn with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Test Server

```bash
# Check health
curl http://localhost:8000/health

# API Docs
http://localhost:8000/docs
```

---

## Project Structure

```
├── main.py              # Entry point
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
├── alembic/            # Database migrations
│   ├── versions/       # Migration files
│   └── env.py         # Alembic config
├── api/                # API routers
│   ├── auth/
│   ├── users/
│   ├── tests/
│   ├── attempts/
│   └── ...
├── core/               # Core utilities
│   ├── config.py      # Configuration
│   ├── security.py    # Auth & RBAC
│   ├── errors.py      # Exception handling
│   └── ...
├── database/          # Database setup
│   ├── base.py       # SQLAlchemy base
│   ├── session.py    # Session management
│   └── ...
├── ml/                # Machine Learning
├── services/          # Business logic
└── tests/             # Unit tests
```

---

## Common Tasks

### Run Tests

```bash
pytest -v
# or with coverage
pytest --cov=api --cov=services tests/
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

### Install New Package

```bash
pip install package-name
pip freeze > requirements.txt
git add requirements.txt
git commit -m "feat: add package-name"
```

---

## Troubleshooting

### PostgreSQL Connection Error
```
ERROR: Connection refused to localhost:5432
```
**Solution:** Ensure PostgreSQL is running:
```bash
# Windows: Start PostgreSQL service
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### Migration Errors
```bash
# Show migration status
alembic current

# Show migration history
alembic history --indicate-current

# Help reset (CAREFUL - development only)
alembic downgrade base
```

### Module Not Found
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

---

## Development Best Practices

1. **Always activate venv** before running commands
2. **Test before committing**:
   ```bash
   pytest
   ```
3. **Create migrations for schema changes**:
   ```bash
   alembic revision --autogenerate -m "Change description"
   ```
4. **Keep `.env` local** (don't commit to git)
5. **Update `requirements.txt`** after installing packages:
   ```bash
   pip freeze > requirements.txt
   ```

---

## Next Steps

- Read [README.md](README.md) for project overview
- Check [PROJECT_STATUS.md](PROJECT_STATUS.md) for current phase
- Review [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design

Happy coding! 🎉
