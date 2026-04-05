# 🎨 AUTOTEST Frontend - Local Development Guide

## Quick Start

### Prerequisites
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Backend running** on `http://localhost:8000`

### One-Command Setup
```powershell
# In frontend directory
npm install
npm run dev
```

Then open: **http://localhost:3000**

---

## 🚀 Running Frontend

### Option 1: From Root Directory
```powershell
cd frontend
npm run dev
```

### Option 2: Manual Terminals
Start the backend and frontend separately without any helper script.

### Option 3: VS Code
```powershell
# Open VS Code splitTerminal
# Terminal 1 (Backend) - root directory:
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000

# Terminal 2 (Frontend) - frontend directory:
cd frontend
npm run dev
```

---

## 📁 Frontend Structure

```
frontend/
├── app/                    # Next.js app router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── [routes]/          # Other pages
├── components/            # React components
├── features/              # Feature modules
│   ├── admin/
│   ├── analytics/
│   ├── payments/
│   ├── simulation/
│   └── ...
├── lib/                   # Utilities
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
├── styles/                # Global styles
├── public/                # Static assets
├── api/                   # API integration
├── proxy.ts               # API proxy
├── .env                   # Environment vars
├── .env.example           # Template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── next.config.ts         # Next.js config
├── eslint.config.mjs      # ESLint config
└── README.md              # Frontend README
```

---

## 🔧 Environment Variables

Frontend `.env` (should match backend):

```
NEXT_PUBLIC_API_BASE=/api
API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note:** Backend must be running on `8000` for API calls to work!

---

## 📦 Available Scripts

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

---

## 🔌 Backend Integration

Frontend communicates with backend via:
- **API_URL**: `http://localhost:8000` (server-side)
- **NEXT_PUBLIC_API_BASE**: `/api` (client-side proxy)

**Key endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /health` - Health check

Check [API Docs](http://localhost:8000/docs) when backend is running.

---

## 🧪 Testing

```bash
# Run tests (if configured)
npm test

# Watch mode
npm test -- --watch
```

---

## 🌐 Features Overview

### User Features
- **Authentication** - Register, login, logout
- **Tests** - Take tests, view scores
- **Analytics** - View performance stats
- **Leaderboard** - Compete with others
- **Payments** - Premium subscription
- **Simulation** - Driving simulation

### Admin Features
- **User Management** - Manage users
- **Analytics** - Global statistics
- **Test Management** - Create/edit tests
- **Settings** - Platform configuration

---

## 🐛 Troubleshooting

### Port 3000 Already in Use
```powershell
# Use different port
npm run dev -- -p 3001
```

### CORS Errors
**Make sure:**
- Backend is running on port 8000
- Backend `.env` includes: `ALLOWED_ORIGINS=http://localhost:3000`
- Frontend `.env` has correct API URL

### Module Not Found
```powershell
# Reinstall dependencies
rm -r node_modules package-lock.json
npm install
```

### Build Errors
```powershell
# Clear Next.js cache
rm -r .next
npm run dev
```

---

## 🔄 API Proxy

Frontend proxies requests to backend via `proxy.ts`:
- Client calls: `/api/auth/login`
- Proxied to: `http://localhost:8000/auth/login`

This prevents CORS issues in development!

---

## 📈 Development Workflow

1. **Start Backend**
   ```powershell
   .\.venv\Scripts\Activate.ps1
   uvicorn main:app --reload --port 8000
   ```

2. **Start Frontend** (new terminal)
   ```powershell
   cd frontend
   npm run dev
   ```

3. **Open Browser**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

4. **Make Changes**
   - Frontend: Auto-reloads on save
   - Backend: Auto-reloads with `--reload`

5. **Test**
   - Check browser console for errors
   - Check backend logs for API issues

---

## 🎯 Next Steps

1. ✅ **Start Backend** - `uvicorn main:app --reload --port 8000`
2. ✅ **Start Frontend** - `npm run dev` in `frontend/` directory
3. 🌐 **Open** - http://localhost:3000
4. 🔐 **Register** - Create test account
5. 🚀 **Test** - Try features
6. 📝 **Code** - Make your changes

---

## 📚 More Documentation

- [Frontend README](./README.md) - Component details
- [COMPONENT_MAP.md](./COMPONENT_MAP.md) - Component directory
- [Backend Docs](../LOCAL_RUN_GUIDE.md) - Backend setup
- [API Docs](http://localhost:8000/docs) - API reference (when running)

---

**Happy coding! 🎉**
