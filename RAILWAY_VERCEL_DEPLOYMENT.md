# Railway + Vercel Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  User Browser                                                   │
│         │                                                        │
│         ├──── HTTPS ───────────────────────────────────────┐    │
│         │                                                  │    │
│         ▼                                                  ▼    │
│    ┌─────────────────┐                         ┌──────────────┐
│    │  Vercel         │                         │  Railway     │
│    │  (Frontend)     │◄───── API Requests ────│  (Backend)   │
│    │                 │                         │              │
│    │  yoursite.com   │─────────────────────────│ api.yoursite │
│    │                 │◄───── JSON Response ───│              │
│    └─────────────────┘                         └──────────────┘
│                                                       │
│                                                       ▼
│                                                  ┌──────────┐
│                                                  │ Railway  │
│                                                  │Database  │
│                                                  └──────────┘
│                                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Deploy Backend to Railway

### 1.1 Prepare Backend

```bash
cd backend

# Ensure requirements.txt is complete
cat requirements.txt

# Should have:
# fastapi>=0.111.0
# uvicorn[standard]>=0.29.0
# python-jose[cryptography]>=3.3.0
# passlib[bcrypt]>=1.7.4
# bcrypt>=4.0.1
# python-multipart>=0.0.9
# aiosqlite>=0.20.0
# Pillow>=10.4.0
```

### 1.2 Create Procfile for Railway

```bash
# In backend/ directory, create Procfile (no extension)
echo "web: uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}" > Procfile
```

### 1.3 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/palmeraie-backend.git
git push -u origin main
```

### 1.4 Deploy on Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub**
3. Select your backend repository
4. Railway auto-detects Python and deploys
5. Go to **Variables** tab and add:

```
SECRET_KEY=<generate-new-key>*
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=12
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0
DATABASE_URL=sqlite:///./palmeraie.db
CORS_ORIGINS=https://yourdomain.vercel.app
```

*Generate SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 1.5 Get Your Railway Backend URL

1. In Railway Dashboard, go to **Settings** → **Domains**
2. Click **Generate Domain** or use auto-generated one
3. Your URL will be: `https://palmeraie-backend-prod-xxxx.railway.app`
4. Copy this — you'll need it for Vercel

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Prepare Frontend

Your frontend is already configured! Just ensure:
- ✅ `frontend/config.js` exists
- ✅ `frontend/index.html` loads `config.js` before `api.js`
- ✅ `frontend/login.html` loads `config.js`

### 2.2 Create Vercel Configuration

In `frontend/vercel.json`:
```json
{
  "buildCommand": "echo 'Frontend ready'",
  "outputDirectory": ".",
  "env": {
    "VITE_API_BASE": "@vite_api_base"
  },
  "headers": [
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

### 2.3 Push Frontend to GitHub

```bash
cd frontend

git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/palmeraie-frontend.git
git push -u origin main
```

### 2.4 Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **New Project** → **Import Git Repository**
3. Select your frontend repository
4. **Framework Preset**: Other
5. **Build Command**: Leave empty (or `echo "ready"`)
6. **Output Directory**: `.` (current directory)
7. Add **Environment Variables**:

```
VITE_API_BASE=https://palmeraie-backend-prod-xxxx.railway.app
```

(Replace with your actual Railway domain)

8. Click **Deploy** ✅

### 2.5 Verify in Vercel

After deployment:
1. Go to **Settings** → **Domains**
2. Your URL will be: `https://yourproject.vercel.app`

---

## Step 3: Configure CORS on Railway Backend

Your backend needs to allow requests from Vercel:

**Update in Railway Variables:**
```
CORS_ORIGINS=https://yourproject.vercel.app
```

Backend code already handles this in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ORIGINS", "*").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Step 4: Update Frontend to Connect

### Option A: Server-Side Injection (Recommended for Vercel)

Create `frontend/api-config.js` that gets injected:

```javascript
// Injected by server at build time
if (!window.ENV) {
  window.ENV = {
    API_BASE: process.env.VITE_API_BASE || 'http://localhost:8000'
  };
}
```

But Vercel can also inject via `vercel.json` → at deployment time.

### Option B: Use Vercel Environment Variables (Easier)

Vercel automatically injects environment variables. Just update your `config.js`:

```javascript
// config.js
const API_BASE = 
  window.ENV?.API_BASE || 
  process.env.VITE_API_BASE || 
  'http://localhost:8000';
```

Actually, for static frontend files, Vercel won't inject JS environment variables. Instead:

**Use a simple script** in `index.html` to set the API:

```html
<script>
  window.ENV = {
    API_BASE: 'https://palmeraie-backend-prod-xxxx.railway.app'
  };
</script>
<script src="config.js"></script>
<script src="api.js"></script>
```

**OR better — use `.env` approach with Vercel:**

Create `frontend/.env.production`:
```
VITE_API_BASE=https://palmeraie-backend-prod-xxxx.railway.app
```

Then in Vercel, set the environment variable in the dashboard which will be available at build time if you add a build step.

---

## Step 5: Add a Build Step to Index.html (Client-Side Injection)

The simplest approach for Vercel static hosting:

Update `frontend/index.html` before script tags:

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  ...
</head>
<body>
  ...
  
  <!-- Inject API config from Vercel environment -->
  <script>
    window.ENV = {
      API_BASE: 'VITE_API_BASE_PLACEHOLDER'
    };
  </script>
  
  <script src="config.js"></script>
  <script src="api.js"></script>
  <script src="app.js"></script>
  ...
</body>
</html>
```

Then in Vercel, add a **Build Script** → **Override**:
```bash
# .vercelignore (if needed)
.env.local

# vercel.json
{
  "buildCommand": "sed -i 's|VITE_API_BASE_PLACEHOLDER|'$VITE_API_BASE'|g' index.html && login.html",
  "outputDirectory": "."
}
```

---

## Simpler Solution: Just Update index.html Directly

Since you're deploying static files, the simplest approach:

1. **Update in Vercel Environment Variables**:
   ```
   VITE_API_BASE=https://palmeraie-backend-prod-xxxx.railway.app
   ```

2. **Add this to `frontend/index.html` (before script tags)**:
   ```html
   <script>
     // Get API base from Vercel environment (deployed via system variable)
     window.ENV = {
       API_BASE: 'https://palmeraie-backend-prod-xxxx.railway.app'
     };
   </script>
   ```

3. **Deploy and test** ✅

---

## Complete Checklist

### Backend (Railway) ✅
- [ ] Push code to GitHub
- [ ] Connect Railway to GitHub repo
- [ ] Add environment variables (SECRET_KEY, CORS_ORIGINS, etc.)
- [ ] Note the Railway domain URL
- [ ] Test `/docs` endpoint is accessible
- [ ] Test login: `POST /auth/login`

### Frontend (Vercel) ✅
- [ ] Add `window.ENV.API_BASE` to `index.html`
- [ ] Ensure `config.js` file exists
- [ ] Ensure `api.js` uses `API_BASE`
- [ ] Push to GitHub
- [ ] Connect Vercel to GitHub repo
- [ ] Add `VITE_API_BASE` environment variable
- [ ] Update `index.html` with correct Railway URL
- [ ] Deploy

### Test Connection ✅
- [ ] Open Vercel frontend URL
- [ ] Try logging in (should hit Railway backend)
- [ ] Check browser console for errors
- [ ] Verify CORS headers in network tab

---

## Troubleshooting

### "CORS error: Origin not allowed"
**Fix:** Update CORS_ORIGINS on Railway to match your Vercel domain:
```
CORS_ORIGINS=https://yourproject.vercel.app
```

### "Cannot reach API / 404"
**Fix:** Check that `VITE_API_BASE` in Vercel matches your Railway domain:
```
https://palmeraie-backend-prod-xxxx.railway.app  ← exact URL
```

### "API_BASE is undefined"
**Fix:** Ensure script loads in order:
```html
<script>window.ENV = { API_BASE: '...' };</script>
<script src="config.js"></script>
<script src="api.js"></script>
```

### Backend responds but frontend shows empty page
**Fix:** Check if JWT token is being saved:
```javascript
// In browser console
localStorage.getItem('token')  // Should return token, not null
```

### "Network error in login"
**Fix:** 
1. Check Vercel domain is in CORS_ORIGINS
2. Check Railway backend is running (check Railway logs)
3. Check frontend URL matches CORS_ORIGINS exactly

---

## Production URLs Example

```
Frontend:  https://palmeraie.vercel.app
Backend:   https://palmeraie-production-xxxx.railway.app
API Base:  https://palmeraie-production-xxxx.railway.app (same as backend)
```

Your frontend's `index.html` will have:
```javascript
window.ENV = {
  API_BASE: 'https://palmeraie-production-xxxx.railway.app'
};
```

---

## Environment Variables Summary

### Railway Backend
```
SECRET_KEY=<long-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=12
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0
DATABASE_URL=sqlite:///./palmeraie.db
CORS_ORIGINS=https://palmeraie.vercel.app
```

### Vercel Frontend
```
VITE_API_BASE=https://palmeraie-production-xxxx.railway.app
```

---

## Next Steps

1. Deploy backend to Railway (get URL)
2. Update CORS_ORIGINS on Railway with Vercel URL
3. Deploy frontend to Vercel
4. Update index.html with Railway URL
5. Test login flow end-to-end
6. Check browser console & Network tab for errors

You're ready to go! 🚀
