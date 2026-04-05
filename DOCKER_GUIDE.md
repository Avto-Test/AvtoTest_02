# AUTOTEST - Docker Development Guide

## Local Development with Docker

### Prerequisites
- Docker Desktop installed and running
- Docker Compose installed

### Quick Start
```bash
# 1. Copy environment file
cp .env.local.example .env.local

# 2. Start all services
docker-compose -f docker-compose.local.yml up --build

# 3. Services will be available at:
# - Backend API: http://localhost:8000
# - Database: localhost:5432
```

### Services
- **PostgreSQL**: Port 5432
- **FastAPI Backend**: Port 8000 with auto-reload

### Development Workflow
```bash
# View logs
docker-compose -f docker-compose.local.yml logs -f backend

# Restart backend
docker-compose -f docker-compose.local.yml restart backend

# Stop all services
docker-compose -f docker-compose.local.yml down
```

---

## Production Deployment with Docker

### Prerequisites
- Production server with Docker
- Environment variables configured

### Deployment Steps
```bash
# 1. Copy production environment
cp .env.prod.example .env.prod

# 2. Edit .env.prod with production values
nano .env.prod

# 3. Deploy
docker-compose -f docker-compose.yml up -d --build

# 4. Check health
curl http://localhost:8000/health
```

### Production Services
- **PostgreSQL**: Internal networking only
- **FastAPI Backend**: Gunicorn with 4 workers
- **Health checks**: Automatic
- **Auto-restart**: On failure
- **Nginx**: Not included in Docker; configure Nginx on the server host separately

### Production Monitoring
```bash
# View logs
docker-compose -f docker-compose.yml logs -f

# Check container status
docker-compose -f docker-compose.yml ps

# Restart services
docker-compose -f docker-compose.yml restart
```

---

## Environment Variables

### Local Development (.env.local)
- Uses default PostgreSQL credentials
- Debug mode enabled
- Auto-reload enabled

### Production (.env.prod)
- Strong database passwords
- Production secret keys
- Debug disabled
- Optimized for performance

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose -f docker-compose.local.yml logs backend

# Check database connection
docker-compose -f docker-compose.local.yml exec db psql -U postgres -d autotest -c "SELECT 1;"
```

### Database issues
```bash
# Reset database
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up --build
```

### Port conflicts
```bash
# Change ports in docker-compose files
# Or stop conflicting services
```

---

## File Structure
```
├── docker-compose.local.yml    # Local development
├── docker-compose.yml          # Production deployment
├── Dockerfile.local            # Local development image
├── Dockerfile.prod             # Production image
├── .env.local.example          # Local env template
├── .env.prod.example           # Production env template
└── DOCKER_GUIDE.md             # This file
```