# Quick Deployment Checklist: Railway + Vercel

## 🚀 TL;DR (30 minutes)

### Backend → Railway
```bash
# 1. Ensure Procfile exists in backend/
echo "web: uvicorn main:app --host 0.0.0.0 --port \${PORT:-8000}" > backend/Procfile

# 2. Push to GitHub
git add . && git commit -m "Deploy" && git push

# 3. On railway.app: New Project → GitHub
# 4. Go to Variables tab, add:
SECRET_KEY=<run: python -c "import secrets; print(secrets.token_urlsafe(32))">
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=12
DATABASE_URL=sqlite:///./palmeraie.db
CORS_ORIGINS=https://YOUR_VERCEL_DOMAIN.vercel.app

# 5. Note your Railway domain: https://xxxxx.railway.app
```

### Frontend → Vercel  
```bash
# 1. Update frontend/index.html (add before <script src="api.js">):
<script>
  window.ENV = { API_BASE: 'https://YOUR_RAILWAY_DOMAIN.railway.app' };
</script>

# 2. Push to GitHub
git add . && git commit -m "Deploy" && git push

# 3. On vercel.com: New Project → GitHub → Import
# 4. Add environment variable:
VITE_API_BASE=https://YOUR_RAILWAY_DOMAIN.railway.app

# 5. Deploy ✅
```

### Update Backend CORS
On Railway Dashboard → Variables:
```
CORS_ORIGINS=https://yourproject.vercel.app
```

---

## Critical: URL Format

| Service | Example URL |
|---------|-------------|
| Railway Backend | `https://palmeraie-backend-prod-xxxx.railway.app` |
| Vercel Frontend | `https://palmeraie-frontend.vercel.app` |
| API_BASE (what frontend uses) | Same as Railway Backend URL |

---

## Connection Flow

```
1. User opens https://palmeraie-frontend.vercel.app
2. Vercel serves index.html (with API_BASE injected)
3. User types credentials
4. Frontend calls: fetch(`${API_BASE}/auth/login`, ...)
5. API_BASE = https://palmeraie-backend-prod-xxxx.railway.app
6. Request sent to Railway backend
7. Backend checks CORS_ORIGINS = https://palmeraie-frontend.vercel.app ✅
8. Response sent back to frontend
9. Token stored in localStorage
10. Dashboard loads ✅
```

---

## Test It Works

```bash
# After both deployments, open browser console:

# Check if API_BASE is set:
console.log(window.ENV.API_BASE)
# Should output: https://palmeraie-backend-prod-xxxx.railway.app

# Try login (should work if CORS is correct)
# Token should be saved:
localStorage.getItem('token')
# Should output: eyJ... (JWT token)
```

---

## If Something Breaks

### Frontend can't reach backend?
- [ ] Check CORS_ORIGINS on Railway = Vercel domain
- [ ] Check `window.ENV.API_BASE` in browser console
- [ ] Check Network tab (look for 401/403 errors)

### Backend not deployed?
- [ ] Check Procfile exists: `backend/Procfile`
- [ ] Check Railway logs: Railway Dashboard → Deployments
- [ ] Ensure requirements.txt listed all packages

### CORS error?
- [ ] Verify Vercel domain in CORS_ORIGINS on Railway
- [ ] Verify it's HTTPS, not HTTP
- [ ] Verify no trailing slashes: `https://xxxx.vercel.app` ✅ vs `https://xxxx.vercel.app/` ❌

### Login works but dashboard blank?
- [ ] Check if token expires: `ACCESS_TOKEN_EXPIRE_HOURS=12`
- [ ] Check browser console for JS errors
- [ ] Check Network → look for failed API calls

---

## Important Environment Variables

### Railway (Backend)
Must have:
- `SECRET_KEY` - Generate new, use for JWT signing
- `CORS_ORIGINS` - Set to your Vercel URL

### Vercel (Frontend)  
Must have:
- `VITE_API_BASE` - Set to your Railway URL

---

## One More Thing

After deployment, **change the default admin password**:
1. Login with: username=`admin`, password=`admin123`
2. Go to admin panel → Users → change password

Or update in Railway Variables:
```
DEFAULT_ADMIN_USERNAME=yourusername
DEFAULT_ADMIN_PASSWORD=yourpassword
```
Then restart the deployment.

---

## Deployment Done? ✅

You now have:
- ✅ Backend running on Railway
- ✅ Frontend running on Vercel  
- ✅ Frontend talks to backend
- ✅ JWT authentication works
- ✅ Database persists on Railway

You're production-ready! 🎉
