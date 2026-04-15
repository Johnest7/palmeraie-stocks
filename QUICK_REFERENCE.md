# Railway + Vercel Setup — Visual Reference Card

Print this or save it while deploying! 🎯

---

## The Flow in One Picture

```
YOUR COMPUTER (development)
  ↓
GitHub Repositories
  ├── palmeraie-backend  →  Railway  →  Backend API
  └── palmeraie-frontend →  Vercel   →  Frontend Site
  
                              ↑ (Internet)
  
Users Open: https://yoursite.vercel.app
  → Loads frontend (HTML/CSS/JS)
  → JavaScript calls: https://backend.railway.app/api/...
  → Backend processes, returns JSON
  → Frontend displays data
```

---

## The 3 URLs (Fill These In)

Save these after deployment:

```
┌─────────────────────────────────────────────┐
│  FRONTEND (Vercel)                          │
│  https://palmeraie-XXXXX.vercel.app         │
│  Your users visit this URL                  │
├─────────────────────────────────────────────┤
│  BACKEND (Railway)                          │
│  https://palmeraie-backend-prod-XXX...app   │
│  Frontend calls this API                    │
├─────────────────────────────────────────────┤
│  SECRET_KEY                                 │
│  ________________________                   │
│  Generated once, never share, never change  │
└─────────────────────────────────────────────┘
```

---

## 4 Steps to Deploy

### Step 1: Backend → Railway (15 min)
```
1. Generate SECRET_KEY
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   
2. Push code to GitHub
   git push origin main
   
3. railway.app → New Project → GitHub
   Select palmeraie-backend
   
4. Add Variables on Railway:
   SECRET_KEY=<your-key>
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_HOURS=12
   DATABASE_URL=sqlite:///./palmeraie.db
   CORS_ORIGINS=<LEAVE BLANK FOR NOW>
   
5. Copy Railway domain:
   https://palmeraie-backend-prod-XXXXX.railway.app
```

### Step 2: Frontend → Vercel (10 min)
```
1. Update frontend/index.html:
   <script>
     window.ENV = {
       API_BASE: 'https://palmeraie-backend-prod-XXXXX.railway.app'
     };
   </script>
   
2. Push to GitHub
   git push origin main
   
3. vercel.com → New Project → GitHub
   Select palmeraie-frontend
   
4. Deploy
   (Vercel auto-redeploys when you push)
   
5. Copy Vercel domain:
   https://palmeraie-XXXXX.vercel.app
```

### Step 3: Connect Them (2 min)
```
Railway Dashboard → Variables → CORS_ORIGINS

Set to: https://palmeraie-XXXXX.vercel.app

Click Redeploy ✅
```

### Step 4: Test (5 min)
```
1. Open frontend: https://palmeraie-XXXXX.vercel.app
2. Login: admin / admin123
3. See dashboard: ✅ Connected!
```

---

## The Secret Configuration Points

*These make or break your connection:*

| Config | Where | Value | Critical? |
|--------|-------|-------|-----------|
| `window.ENV.API_BASE` | frontend/index.html | Railway domain | 🔴 YES |
| `CORS_ORIGINS` | Railway Variables | Vercel domain | 🔴 YES |
| `SECRET_KEY` | Railway Variables | Random string | 🔴 YES |

**Don't mistake these or it won't work!**

---

## Troubleshooting: 3 Commandments

### ✋ STOP! Before you debug:

1. **Is the URL spelled exactly right?**
   ```
   ✅ https://domain.railway.app (no trailing slash)
   ❌ https://domain.railway.app/ (slash breaks it)
   ```

2. **Did you Redeploy after changing variables?**
   ```
   Railway: Click the "Redeploy" button
   Vercel:  Push to GitHub → auto-redeploys
   ```

3. **Did you wait 2 minutes after redeploy?**
   ```
   ⏳ Wait... deployments take time
   ✅ Then test again
   ```

---

## Error Cheat Sheet

| Error | Cause | Fix |
|-------|-------|-----|
| **CORS error** | Frontend URL not in CORS_ORIGINS | Update Railway Variables |
| **Cannot reach API** | API_BASE URL wrong | Check window.ENV.API_BASE in console |
| **404 on /docs** | Backend offline | Check Railway deployment logs |
| **Login shows nothing** | Frontend can't reach backend | Check Network tab, then CORS |
| **Token invalid** | SECRET_KEY changed | Never regenerate SECRET_KEY |

---

## Pre-Deployment Checklist

- [ ] Backend/Procfile exists ✅
- [ ] Frontend/config.js exists ✅
- [ ] requirements.txt complete ✅
- [ ] GitHub accounts ready
- [ ] Railway account ready
- [ ] Vercel account ready

---

## Post-Deployment Checklist

- [ ] Backend /docs page loads
- [ ] Frontend login page loads
- [ ] Can login with admin/admin123
- [ ] Dashboard shows data
- [ ] Change default admin password 🔐

---

## Command Reference

### Generate SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Push to GitHub (any directory)
```bash
git add .
git commit -m "Deploy"
git push origin main
```

### Test backend API
```bash
# Add /docs to your Railway domain
curl https://palmeraie-backend-prod-XXXXX.railway.app/docs
```

### Check frontend API base
```bash
# In browser console
console.log(window.ENV.API_BASE)
# Should output: https://palmeraie-backend-prod-XXXXX.railway.app
```

---

## Important: Never Do This ❌

```
❌ Push .env file to GitHub
   → It contains secrets!
   → Use .env.example instead

❌ Regenerate SECRET_KEY in production
   → All users must log in again
   → JWT tokens become invalid

❌ Use domain without https://
   → Frontend on https can't call http backend
   → Browsers block it for security

❌ Forget to Redeploy after variable changes
   → Changes won't take effect
   → Old values still used

❌ Mix up CORS_ORIGINS: put Backend domain there
   → Should be FRONTEND domain for CORS
   → Backend needs it to allow cross-site requests
```

---

## Always Match These

```
IN: frontend/index.html
window.ENV.API_BASE = 'https://palmeraie-backend-prod-XXXXX.railway.app'
                                      ↑
                                      └── YOUR RAILWAY DOMAIN

IN: Railway Variables
CORS_ORIGINS = 'https://palmeraie-XXXXX.vercel.app'
                              ↑
                              └── YOUR VERCEL DOMAIN

In: Browser (test)
console.log(window.ENV.API_BASE)
// Should match the frontend/index.html value above
```

---

## Save These Commands

```bash
# Deploy backend
cd backend && git add . && git commit -m "Deploy" && git push

# Deploy frontend  
cd frontend && git add . && git commit -m "Deploy" && git push

# Generate new dev SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Need Help?

| Problem | Check This Doc |
|---------|----------------|
| How do I deploy? | STEP_BY_STEP_DEPLOYMENT.md |
| How does it work? | CONNECTION_GUIDE.md |
| What's everything? | RAILWAY_VERCEL_DEPLOYMENT.md |
| Something broke | Look in docs' Troubleshooting sections |
| Full index | DEPLOYMENT_INDEX.md |

---

## Quick Timeline

| Step | Time | Waiting |
|------|------|---------|
| Generate key | 1 min | — |
| Push code | 5 min | — |
| Deploy backend | 10 min | 2-3 min |
| Deploy frontend | 10 min | 2-3 min |
| Connect & test | 5 min | 1 min |
| **TOTAL** | **~40 min** | ~5-6 min |

---

**You Got This! 🚀**

When you're ready: Start with `STEP_BY_STEP_DEPLOYMENT.md` → Part A, Step A1
