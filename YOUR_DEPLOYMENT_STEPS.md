# Your Exact Deployment Steps (Based on Your .env)

## Current Situation
✅ Backend is already deployed on Railway at:
```
https://palmeraie-stocks-production-8ae8.up.railway.app
```

📋 Now you need to: **Deploy frontend on Vercel and connect them**

---

## Step 1: Generate a New SECRET_KEY ⚡ (1 minute)

Your current `.env` has:
```
SECRET_KEY=palmeraie-secret-change-in-production
```

❌ This is a default key. You MUST change it for production.

### Generate a Real Key
Open PowerShell and run:
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

You'll get something like:
```
7K-z_XvQ3m1jK9pLw2q8R5sT6vU0xY2zA4bC6dEfGhI
```

**Copy this value — you'll need it in Railway Variables**

---

## Step 2: Update Your .env File (2 minutes)

In your `.env` file, change these values:

### 2a: Update SECRET_KEY
```
Before:
SECRET_KEY=palmeraie-secret-change-in-production

After:
SECRET_KEY=7K-z_XvQ3m1jK9pLw2q8R5sT6vU0xY2zA4bC6dEfGhI
```
(Use YOUR generated key, not the example above)

### 2b: Update CORS_ORIGINS
```
Before:
CORS_ORIGINS=*

After (you'll update this AFTER Vercel deployment):
CORS_ORIGINS=https://yourvercelsite.vercel.app
```
(You'll know this URL after Vercel deployment, so leave a placeholder for now or come back to it)

### 2c: Everything else stays the same ✅
```
VITE_API_BASE=https://palmeraie-stocks-production-8ae8.up.railway.app  ← Keep this!
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0
DATABASE_URL=sqlite:///./palmeraie.db
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=12
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
```

---

## Step 3: Update Railway Variables With New SECRET_KEY (3 minutes)

1. Go to **[railway.app](https://railway.app)** → Log in
2. Find your backend project: **palmeraie-backend** or similar
3. Click **Variables** tab
4. Find: **SECRET_KEY** field
5. Change value from: `palmeraie-secret-change-in-production`
   To: Your newly generated key
6. Click **Redeploy** button (top right)
7. Wait 2-3 minutes for deployment to finish

✅ **Check**: Railway shows "Deployment successful"

---

## Step 4: Update Frontend with Backend URL (2 minutes)

Your backend URL is already set in `.env`:
```
VITE_API_BASE=https://palmeraie-stocks-production-8ae8.up.railway.app
```

Now update **frontend/index.html** to use this same URL:

1. Open: `frontend/index.html` in editor
2. Find: `</head>` tag (around line 100-105)
3. Add this BEFORE the `<script>` tags:

```html
  <script>
    // Set API endpoint to your production Railway backend
    window.ENV = {
      API_BASE: 'https://palmeraie-stocks-production-8ae8.up.railway.app'
    };
  </script>
```

4. Save the file

✅ **Check**: index.html has the window.ENV block with your Railway URL

---

## Step 5: Do the Same for login.html (1 minute)

Open: `frontend/login.html`

This should already have `<script src="config.js"></script>` added.

**Check it has:**
```html
<script src="config.js"></script>
```

If NOT, add it before the login form script section.

✅ **Check**: login.html loads config.js

---

## Step 6: Push Frontend to GitHub (3 minutes)

```powershell
cd frontend

# Check git status
git status

# Add all changes
git add .

# Commit
git commit -m "Add API configuration for production deployment"

# Push to GitHub
git push origin main
```

If you don't have a GitHub repo yet:
```powershell
git init
git add .
git commit -m "Initial frontend commit"
git branch -M main

# Then create repo at github.com and run:
git remote add origin https://github.com/YOUR_USERNAME/palmeraie-frontend.git
git push -u origin main
```

✅ **Check**: Code is on GitHub

---

## Step 7: Deploy Frontend on Vercel (10 minutes)

1. Go to **[vercel.com](https://vercel.com)** → Sign up or Log in
2. Click **New Project**
3. Click **Import Git Repository**
4. Select your **palmeraie-frontend** GitHub repo
5. **Framework Preset**: Select "Other" (it's plain HTML)
6. **Build Command**: Leave EMPTY (no build needed)
7. **Output Directory**: Leave as `.` (default)
8. **Root Directory**: Leave empty
9. Click **Deploy**
10. ⏳ Wait 2-3 minutes
11. Vercel shows deployment success
12. Copy your Vercel domain:
    ```
    https://palmeraie-XXXXX.vercel.app
    ```
    (XXXXX will be unique to your project)

✅ **Check**: Frontend is live at your Vercel URL

---

## Step 8: Test Frontend Connection (2 minutes)

1. Open your new Vercel frontend URL in browser
2. You should see the **La Palmeraie login page**
3. Open browser **Console** (Press F12, click "Console" tab)
4. Type: `window.ENV.API_BASE`
5. Press Enter
6. Should show: `https://palmeraie-stocks-production-8ae8.up.railway.app`

✅ **Check**: API_BASE is your Railway URL

---

## Step 9: Update CORS on Railway (2 minutes)

Now that Vercel is deployed, update CORS:

1. Go to **Railway Dashboard**
2. Go to **Variables** tab
3. Find: **CORS_ORIGINS**
4. Change from: `*`
   To: `https://palmeraie-XXXXX.vercel.app`
   (Use YOUR Vercel domain from Step 7)
5. Click **Redeploy**
6. Wait 2 minutes

✅ **Check**: Railway redeployed with new CORS_ORIGINS

---

## Step 10: Test Login (3 minutes)

1. Go back to your Vercel frontend: `https://palmeraie-XXXXX.vercel.app`
2. Login with:
   - Username: `admin`
   - Password: `admin123`
3. Click **Se connecter** (Connect)
4. Should redirect to **dashboard**
5. Should see data (products, statistics, etc.)

✅ **Check**: Login works and dashboard loads

---

## Step 11: Verify Token is Saved (1 minute)

1. Open browser console (F12 → Console)
2. Type: `localStorage.getItem('token')`
3. Press Enter
4. Should show a token starting with: `eyJ...`

✅ **Check**: Token is saved in localStorage

---

## Step 12: Test Network Requests (2 minutes)

1. Open browser **Network** tab (F12 → Network)
2. Refresh dashboard page
3. Look for requests to your Railway domain
4. Click on one REST API request
5. Click **Headers** tab
6. Should see:
   ```
   Authorization: Bearer eyJ...
   ```

✅ **Check**: Frontend is sending authenticated requests to Railway

---

## Final Checklist ✅

- [ ] Generated new SECRET_KEY
- [ ] Updated SECRET_KEY in Railway Variables
- [ ] Updated VITE_API_BASE in .env
- [ ] Updated window.ENV in frontend/index.html
- [ ] Updated window.ENV in frontend/login.html
- [ ] Pushed frontend to GitHub
- [ ] Deployed frontend on Vercel
- [ ] Updated CORS_ORIGINS in Railway Variables
- [ ] Can login with admin/admin123
- [ ] Dashboard shows data
- [ ] Token is in localStorage
- [ ] Network requests go to Railway

**If all 12 are checked ✅, you're done!** 🚀

---

## What You Now Have

```
┌────────────────────────────────────────────────┐
│  Users Browser                                 │
│  Opens: https://palmeraie-XXXXX.vercel.app    │
│         ↓                                      │
│  Vercel (Frontend)                            │
│  Serves HTML/CSS/JS                           │
│         ↓                                      │
│  User logs in                                 │
│         ↓                                      │
│  frontend/api.js calls:                       │
│  fetch(`${API_BASE}/auth/login`, ...)         │
│         ↓                                      │
│  API_BASE = https://...production...railway.app
│         ↓                                      │
│  Railway (Backend) receives request           │
│  Checks CORS_ORIGINS = vercel.app ✅          │
│  Verifies token with SECRET_KEY ✅            │
│  Returns data ✅                               │
│         ↓                                      │
│  Frontend shows dashboard                     │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Your Production URLs

**Save these:**

```
Frontend:  https://palmeraie-XXXXX.vercel.app
Backend:   https://palmeraie-stocks-production-8ae8.up.railway.app
Admin:     admin / admin123

SECRET_KEY: [Your generated key]
```

---

## If Something Goes Wrong

### ❌ "Cannot reach API"
```
Fix:
1. Check window.ENV.API_BASE in console
2. Verify it's: https://palmeraie-stocks-production-8ae8.up.railway.app
3. If wrong, update frontend/index.html and push to GitHub
```

### ❌ "CORS error"
```
Fix:
1. Check Railway Variables → CORS_ORIGINS
2. Must be exactly: https://palmeraie-XXXXX.vercel.app
3. No trailing / at the end
4. Click Redeploy and wait 2 min
```

### ❌ "Login button does nothing"
```
Fix:
1. Open console → look for errors
2. Open Network tab → check requests to Railway
3. If no requests: CORS issue (see above)
4. If request fails: backend offline (check Railway logs)
```

### ❌ "Token invalid after login"
```
Fix:
1. Don't change SECRET_KEY again
2. Users need to clear localStorage and log back in
3. Clear: localStorage.clear() in console
```

---

## You're Done! 🎉

Your system is now:
- ✅ Backend running on Railway (production)
- ✅ Frontend running on Vercel (production)
- ✅ Frontend talks to backend
- ✅ JWT authentication works
- ✅ CORS configured properly

**Everything is connected!**

---

## Next: Change Default Password 🔐

1. Login as admin/admin123
2. Go to admin panel
3. Change password to something secure
4. Tell your manager the new credentials

Then you're **truly production-ready**! 🚀
