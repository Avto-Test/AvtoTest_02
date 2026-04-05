# ⚡ AUTOTEST Full Stack - Complete Setup (Backend + Frontend)

## 🎯 What You Have Now

✅ **Backend** (Python FastAPI)
- Port: 8000
- Database: PostgreSQL
- API: http://localhost:8000/docs

✅ **Frontend** (Next.js React)
- Port: 3000
- Node modules: Installed & Ready
- UI: http://localhost:3000

---

## 🚀 Start Everything (Recommended Setup)

### **EASIEST: Use VS Code Split Terminal**

1. **Open VS Code** in project folder:
   ```powershell
   code .
   ```

2. **Create Split Terminal** (Ctrl+Shift+5):
   
   **LEFT Terminal (Backend):**
   ```powershell
   # Activate Python venv
   .\.venv\Scripts\Activate.ps1
   
   # Run migrations (first time only)
   alembic upgrade head
   
   # Start backend server
   uvicorn main:app --reload --port 8000
   ```

   **RIGHT Terminal (Frontend):**
   ```powershell
   # Go to frontend folder
   cd frontend
   
   # Start dev server
   npm run dev
   ```

3. **Open Browser:**
   - Frontend: http://localhost:3000 ✓
   - Backend API: http://localhost:8000/docs ✓

---

## 🔧 Alternative: Two Separate Terminals

### Terminal 1 - Backend
```powershell
cd C:\Users\user\Desktop\Loyiha_003.1
.\.venv\Scripts\Activate.ps1
alembic upgrade head    # One-time setup
uvicorn main:app --reload --port 8000
```

### Terminal 2 - Frontend
```powershell
cd C:\Users\user\Desktop\Loyiha_003.1\frontend
npm run dev
```

### Wait for Both to Show:
```
✓ Backend: "Application startup complete"
✓ Frontend: "ready - started server on 0.0.0.0:3000, url: http://localhost:3000"
```

---

## ✅ Verification Checklist

After both are running, verify:

```
✓ Frontend loads: http://localhost:3000
✓ Backend API docs: http://localhost:8000/docs
✓ Health check: curl http://localhost:8000/health
✓ Frontend can call API: Check browser console (no CORS errors)
```

---

## 📋 Quick Reference

| Component | Port | Startup Command | Status |
|-----------|------|-----------------|--------|
| **Backend (FastAPI)** | 8000 | `uvicorn main:app --reload --port 8000` | ✓ Ready |
| **Frontend (Next.js)** | 3000 | `npm run dev` (in `/frontend`) | ✓ Ready |
| **Database (PostgreSQL)** | 5432 | Auto (service) | ✓ Running |

---

## 🔗 Connection Flow

```
Browser (localhost:3000)
    ↓
Frontend (Next.js)
    ↓
API Proxy (proxy.ts)
    ↓
Backend (FastAPI:8000)
    ↓
PostgreSQL (Database)
```

---

## 🛑 Stopping Everything

```powershell
# Terminal 1 (Backend): Ctrl+C
# Terminal 2 (Frontend): Ctrl+C
```

---

## ⚙️ Configuration Files

### Backend (.env in root)
```
DATABASE_URL=postgresql+asyncpg://postgres:79845209@localhost:5432/autotest
SECRET_KEY=your-secret-key-change-in-production
DEBUG=true
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend (.env in frontend/)
```
NEXT_PUBLIC_API_BASE=/api
API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🧹 Maintenance Commands

```powershell
# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install

# Reset frontend cache
cd frontend && rm -r .next && npm run dev

# Reset backend database (WARNING: Deletes data)
alembic downgrade base
alembic upgrade head

# See database migrations
alembic history

# Clear npm cache
npm cache clean --force
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| [LOCAL_RUN_GUIDE.md](./LOCAL_RUN_GUIDE.md) | Backend setup & development |
| [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) | Frontend setup & features |
| [QUICK_START.md](./QUICK_START.md) | Quick reference |

---

## 🔍 Troubleshooting

### Backend won't start
```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Use different port
uvicorn main:app --reload --port 8001

# Check database connection
psql autotest -c "SELECT 1;"
```

### Frontend won't load
```powershell
# Clear cache and reinstall
cd frontend && rm -r node_modules .next package-lock.json
npm install && npm run dev

# Try different port
npm run dev -- -p 3001
```

### API calls failing (CORS)
```
1. Check backend is running on 8000
2. Check .env ALLOWED_ORIGINS includes http://localhost:3000
3. Check browser console for error details
4. Try: http://localhost:8000/health
```

---

## 🎓 Development Tips

1. **Always keep both running** - Frontend needs backend API
2. **Use browser DevTools** - Check Network tab for API calls
3. **Check console logs** - Both terminal and browser console
4. **Hot reload works** - Save file = instant update
5. **API docs helpful** - http://localhost:8000/docs when backend running

---

## 🚀 Ready to Go!

You have everything set up for full-stack local development:

**✓ Backend Framework** (FastAPI)  
**✓ Frontend Framework** (Next.js React)  
**✓ Database** (PostgreSQL)  
**✓ Dependencies** (All installed)  
**✓ Configuration** (Ready to use)  

### Next Step:
Run the split terminal setup above and start coding! 🎉

---

**Questions?** Check the relevant guide:
- Backend issues → [LOCAL_RUN_GUIDE.md](./LOCAL_RUN_GUIDE.md)
- Frontend issues → [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)
- General setup → [QUICK_START.md](./QUICK_START.md)
