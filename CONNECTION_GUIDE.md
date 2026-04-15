# 🔗 Connection Guide: How Frontend & Backend Talk

## The Flow in 5 Steps

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                    1. USER OPENS VERCEL LINK                  ┃
┃              https://palmeraie-frontend.vercel.app             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                              │
                              │ Browser requests HTML
                              ▼
              ┌─────────────────────────────────┐
              │  Vercel (Frontend)              │
              │                                 │
              │  Serves: index.html             │
              │  Contains:                      │
              │  <script>                       │
              │    window.ENV = {               │
              │      API_BASE: 'https://...     │
              │      railway.app'               │
              │    };                           │
              │  </script>                      │
              └─────────────────────────────────┘
                              │
                              │
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃           2. FRONTEND JAVASCRIPT LOADS & RUNS                 ┃
┃                                                                ┃
┃  - config.js reads window.ENV.API_BASE                        ┃
┃  - api.js uses API_BASE for all requests                      ┃
┃  - app.js controls UI and calls api.get(), api.post(), etc.   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                              │
                              │
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃          3. USER LOGS IN (clicks "Se connecter")              ┃
┃                                                                ┃
┃  Frontend calls:                                              ┃
┃  fetch(`${API_BASE}/auth/login`, {                           ┃
┃    method: 'POST',                                            ┃
┃    body: { username, password }                              ┃
┃  })                                                           ┃
┃                                                                ┃
┃  Expands to:                                                  ┃
┃  https://palmeraie-backend-prod-xxxx.railway.app/auth/login   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                              │
                              │ HTTPS Request travels to Railway
                              │ (Internet → Railway servers)
                              ▼
              ┌─────────────────────────────────┐
              │  Railway (Backend)              │
              │                                 │
              │  Receives POST /auth/login      │
              │  Checks CORS:                   │
              │  Origin = palmeraie-frontend    │
              │           .vercel.app           │
              │  Matches CORS_ORIGINS? ✅       │
              │  Yes → proceed                  │
              │  No → block (CORS error)        │
              │                                 │
              │  Routes to: routes/auth.py      │
              │  Hash password + verify         │
              │  Query database                 │
              │  Create JWT token               │
              │  Return {token, user_id, ...}   │
              └─────────────────────────────────┘
                              │
                              │ Response sent back
                              ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃              4. RESPONSE ARRIVES AT FRONTEND                  ┃
┃                                                                ┃
┃  API response: { token: 'eyJ...', user_id: 1, ... }          ┃
┃  api.js processes response                                    ┃
┃  app.js saves to localStorage:                               ┃
┃    localStorage.setItem('token', data.token)                 ┃
┃  Redirect to index.html (dashboard)                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                              │
                              │
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃            5. DASHBOARD LOADS (subsequent calls)              ┃
┃                                                                ┃
┃  Frontend calls: api.get('/reports/dashboard')               ┃
┃  api.js automatically adds:                                  ┃
┃  Authorization: Bearer eyJ...                                ┃
┃  (uses token from localStorage)                              ┃
┃                                                                ┃
┃  Railway backend receives request                            ┃
┃  Verifies token signature (uses SECRET_KEY)                  ┃
┃  Returns dashboard data                                      ┃
┃  Frontend displays data                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## The Critical Configuration Points

### Point 1: Frontend URL (in index.html)
```javascript
// This MUST match your Railway backend URL exactly
window.ENV = {
  API_BASE: 'https://palmeraie-backend-prod-xxxx.railway.app'
  // No trailing slash! ✅ Correct
  // NOT: ...railway.app/ ❌ Wrong
};
```

### Point 2: Backend CORS (on Railway Dashboard)
```
CORS_ORIGINS=https://palmeraie-frontend.vercel.app
// This MUST match your Vercel frontend URL exactly
// No trailing slash!
```

### Point 3: Backend Secret (on Railway Dashboard)
```
SECRET_KEY=<your-generated-long-random-string>
// Must be the SAME each time (don't regenerate)
// Used to sign and verify JWT tokens
```

---

## What Needs to Match

| Frontend | Backend | Must Match? |
|----------|---------|------------|
| Uses: `API_BASE` | Hosted at: Railway domain | ✅ YES |
| Sends from: Vercel domain | Allows CORS from: Vercel domain | ✅ YES |
| Stores token from: Backend | Signed with: SECRET_KEY | ✅ YES |

---

## Error Scenarios & Fixes

### ❌ "CORS error: Access-Control-Allow-Origin"
```
Problem: Browser blocked request from Vercel → Railway
Cause:   CORS_ORIGINS on Railway doesn't match Vercel URL

Fix: On Railway Dashboard → Variables
Update: CORS_ORIGINS=https://palmeraie-frontend.vercel.app
Then:   Restart deployment
```

### ❌ "Cannot reach API" or "404"
```
Problem: Frontend can't find backend
Cause:   API_BASE URL is wrong or Railway offline

Fix: Check window.ENV.API_BASE in browser console
     Type: console.log(window.ENV.API_BASE)
     Should show: https://palmeraie-backend-prod-xxxx.railway.app
     
     If wrong, update index.html with correct URL
     If right but still fails, Railway backend might be offline
```

### ❌ "Token invalid" after login
```
Problem: Backend rejects token from frontend
Cause:   SECRET_KEY changed or was regenerated

Fix: NEVER regenerate SECRET_KEY once set
     All existing tokens become invalid
     Users must log in again
     
     If you must change it:
     1. Update SECRET_KEY on Railway
     2. Redeploy
     3. All users must clear localStorage and log in again
```

### ❌ "Frontend can't load" on Vercel
```
Problem: index.html not deployed correctly
Cause:   Missing API_BASE injection
         OR wrong file structure

Fix: Verify frontend/ folder is uploaded with:
     - index.html (with window.ENV script)
     - config.js
     - api.js
     - app.js
     - style.css
     - login.html
     - manifest.json
     - sw.js
```

---

## Testing the Connection

### Before Deployment (Local)
```bash
# Terminal 1: Start backend
cd backend
python -m uvicorn main:app --reload

# Terminal 2: Open frontend in browser
# Open frontend/index.html
# In console, check: window.ENV.API_BASE
# Should be: http://localhost:8000
```

### After Deployment (Production)
```bash
# 1. Open https://palmeraie-frontend.vercel.app
# 2. Open browser console (F12)
# 3. Type: console.log(window.ENV.API_BASE)
#    Should show: https://palmeraie-backend-prod-xxxx.railway.app
# 4. Try login with: admin / admin123
#    Should redirect to dashboard
# 5. Check localStorage: localStorage.getItem('token')
#    Should show JWT token (eyJ...)
```

---

## Summary: The 3 URLs You Need

1. **Backend Domain** (Railway)
   - Example: `https://palmeraie-backend-prod-xxxx.railway.app`
   - Used in: Frontend's `window.ENV.API_BASE`
   - Used in: CORS_ORIGINS check

2. **Frontend Domain** (Vercel)
   - Example: `https://palmeraie-frontend.vercel.app`
   - Used in: Railway's `CORS_ORIGINS`
   - Accessed by: Your users

3. **API Base URL** (Same as Backend Domain)
   - Example: `https://palmeraie-backend-prod-xxxx.railway.app`
   - Used by: Frontend code (API calls)
   - Comes from: `window.ENV.API_BASE`

---

## Quick Verification Checklist

After both deployments:

- [ ] Browser can reach frontend: https://palmeraie-frontend.vercel.app ✅
- [ ] Backend API is online: https://palmeraie-backend-prod-xxxx.railway.app/docs ✅
- [ ] Frontend's `window.ENV.API_BASE` = Backend URL ✅
- [ ] Railway's `CORS_ORIGINS` = Frontend URL ✅
- [ ] Can log in with admin/admin123 ✅
- [ ] Dashboard loads and shows data ✅
- [ ] Network tab shows requests to Railway ✅

**If all 7 are ✅, you're connected! 🎉**
