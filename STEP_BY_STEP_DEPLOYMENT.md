# Railway + Vercel Deployment: Step-by-Step

Follow these steps **in order**. Each step is specific and actionable.

---

## PART A: Deploy Backend to Railway (20 mins)

### Step A1: Prepare Your Backend for Railway
```bash
cd backend

# Verify Procfile exists and looks good
cat Procfile
# Output should be: web: python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

✅ **Check**: Procfile exists and has correct content

### Step A2: Generate a New Secret Key
```bash
# Run this command (you need Python installed)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Example output: 
# 7K-z_XvQ3m1jK9pLw2q8R5sT6vU0xY2zA4bC6dE

# Copy this value — you'll use it in next step
```

✅ **Check**: You have a new SECRET_KEY (32+ characters)

### Step A3: Push Backend to GitHub
```bash
# From project root
cd backend

git config --global user.name "Your Name"
git config --global user.email "your.email@gmail.com"

git init
git add .
git commit -m "Initial backend commit"
git branch -M main

# You'll need to create a GitHub repo first:
# 1. Go to github.com → New Repository
# 2. Name it: palmeraie-backend
# 3. Click "Create repository" (don't add README/gitignore)
# 4. Copy the "or push an existing repository from the command line" command
# 5. Run it:

git remote add origin https://github.com/YOUR_USERNAME/palmeraie-backend.git
git push -u origin main
```

✅ **Check**: Code is on GitHub at github.com/YOUR_USERNAME/palmeraie-backend

### Step A4: Deploy on Railway
1. Go to **[railway.app](https://railway.app)** → Sign up or Log in
2. Click **New Project** → **Deploy from GitHub repo**
3. Authorize Railway to access your GitHub account
4. Select: `palmeraie-backend` repository
5. Click **Deploy** (Wait 2-3 minutes)
6. Once deployed, go to **Settings** → **Domains**
7. Copy your domain: `https://palmeraie-backend-prod-XXXXX.railway.app`
8. **Save this URL** — you need it for frontend!

✅ **Check**: Backend is deployed and has a domain URL

### Step A5: Add Environment Variables to Railway
1. In Railway Dashboard → Your project → **Variables** tab
2. Add these variables (click "+ New Variable"):

```
Name: BACKEND_HOST
Value: 0.0.0.0

Name: BACKEND_PORT
Value: 8000

Name: DATABASE_URL
Value: sqlite:///./palmeraie.db

Name: SECRET_KEY
Value: [paste the key from Step A2]

Name: ALGORITHM
Value: HS256

Name: ACCESS_TOKEN_EXPIRE_HOURS
Value: 12

Name: CORS_ORIGINS
Value: [LEAVE BLANK FOR NOW - update in Step B after Vercel deployment]
```

3. Click **Redeploy** button (top right)
4. Wait for deployment to finish

✅ **Check**: All variables are set and deployment succeeded

### Step A6: Test Backend is Running
1. Open in browser: `https://palmeraie-backend-prod-XXXXX.railway.app/docs`
2. You should see **FastAPI Swagger docs** (interactive API documentation)
3. If you see 404, the backend isn't deployed correctly — check Railway logs

✅ **Check**: Backend API docs page loads

---

## PART B: Deploy Frontend to Vercel (15 mins)

### Step B1: Update Frontend with Backend URL
1. Open: `frontend/index.html` in your editor
2. Find the closing `</head>` tag (around line 100-105)
3. Add this before any `<script>` tags (find where other <script> tags are):

```html
  <script>
    // Set API endpoint from Railway
    window.ENV = {
      API_BASE: 'https://palmeraie-backend-prod-XXXXX.railway.app'
      // Replace XXXXX with your actual Railway domain number
    };
  </script>
```

4. Save the file

✅ **Check**: index.html has the window.ENV block with YOUR Railway domain

### Step B2: Verify API Configuration Files Exist
```bash
cd frontend

# Check these files exist:
ls config.js       # Should exist and be 200+ bytes
ls api.js          # Should exist and be 2000+ bytes
ls login.html      # Should exist
ls index.html      # Should exist
```

✅ **Check**: All 4 files exist

### Step B3: Push Frontend to GitHub
```bash
# From project root
cd frontend

git init
git add .
git commit -m "Initial frontend commit"
git branch -M main

# Create new GitHub repo:
# 1. Go to github.com → New Repository
# 2. Name it: palmeraie-frontend
# 3. Click Create (don't add README/gitignore)

git remote add origin https://github.com/YOUR_USERNAME/palmeraie-frontend.git
git push -u origin main
```

✅ **Check**: Frontend code is on GitHub

### Step B4: Deploy on Vercel
1. Go to **[vercel.com](https://vercel.com)** → Sign up or Log in
2. Click **New Project** → **Import Git Repository**
3. Authorize Vercel to access GitHub
4. Select: `palmeraie-frontend` repository
5. **Framework Preset**: Select "Other" (it's static HTML)
6. **Build Command**: Leave EMPTY
7. **Output Directory**: Leave as `.` (current directory)
8. **Root Directory**: Leave as `./` or empty
9. Click **Deploy**
10. Wait 2-3 minutes
11. Click on the deployment URL, copy it: `https://palmeraie-XXXXX.vercel.app`
12. **Save this URL** — you need it for backend!

✅ **Check**: Frontend loads at https://palmeraie-XXXXX.vercel.app

---

## PART C: Connect Frontend & Backend (5 mins)

### Step C1: Update Backend CORS Settings
1. Go back to **Railway Dashboard** → Your project → **Variables**
2. Find: `CORS_ORIGINS`
3. Set to: `https://palmeraie-XXXXX.vercel.app` (from Step B4)
4. Click **Redeploy**
5. Wait for deployment to finish (~2 mins)

✅ **Check**: Backend redeployed with CORS_ORIGINS set

---

## PART D: Test Everything (5 mins)

### Step D1: Test Backend
1. Open: `https://palmeraie-backend-prod-XXXXX.railway.app/docs`
2. You should see Swagger API docs
3. Click **Authorize** button (if visible)
4. Click **Try it out** on any GET endpoint
5. Should return data

✅ **Check**: Backend API responds to requests

### Step D2: Test Frontend Connection
1. Open: `https://palmeraie-XXXXX.vercel.app` (your Vercel frontend)
2. Open **Browser Console** (Press F12, click "Console" tab)
3. Type: `window.ENV.API_BASE`
4. Press Enter
5. Should show: `https://palmeraie-backend-prod-XXXXX.railway.app`

✅ **Check**: API_BASE is correct

### Step D3: Test Login
1. Refresh the frontend page
2. You should see **La Palmeraie** login screen
3. Username: `admin`
4. Password: `admin123`
5. Click **Se connecter** button
6. Should see dashboard with data

✅ **Check**: Login works and you see the dashboard

### Step D4: Verify Token is Stored
1. In browser console, type: `localStorage.getItem('token')`
2. Should show: `eyJ...` (a JWT token)
3. If shows `null`, login didn't work

✅ **Check**: Token is in localStorage

### Step D5: Check Network Tab
1. Press F12, click **Network** tab
2. Refresh page
3. Look for requests to your Railway domain
4. Click on one → Headers
5. Should see: `Authorization: Bearer eyJ...`

✅ **Check**: Frontend is sending requests to Railway backend

---

## If Tests Pass ✅

**Congratulations!** You're fully deployed:
- ✅ Backend running on Railway
- ✅ Frontend running on Vercel
- ✅ Frontend connects to backend
- ✅ Login works
- ✅ JWT authentication works

**Go get some coffee ☕ — you earned it!**

---

## If Something Fails ❌

### Problem: "CORS error"
```
Solution:
1. Go to Railway Dashboard → Variables
2. Check CORS_ORIGINS = your Vercel domain (exactly)
3. No trailing slash: https://domain.vercel.app ✅
4. If wrong, update and click Redeploy
5. Wait 2 minutes
6. Refresh frontend, try login again
```

### Problem: "Cannot reach API"
```
Solution:
1. Open browser console: console.log(window.ENV.API_BASE)
2. Check it matches your Railway domain
3. If wrong:
   - Edit frontend/index.html
   - Update window.ENV.API_BASE with correct URL
   - Commit and push to GitHub
   - Vercel auto-redeploys (watch Deployments tab)
4. Refresh and test
```

### Problem: "Login button does nothing"
```
Solution:
1. Open browser console (F12)
2. Look for error messages
3. Check Network tab → look for requests to Railway
4. If no requests: window.ENV.API_BASE is wrong
5. If request shows 404: backend not running (check Railway dashboard)
6. If request shows 403/401: CORS issue (see CORS error solution above)
```

### Problem: "Page loads but no data shown"
```
Solution:
1. Wait 10 seconds (data might be loading)
2. Open console → look for JS errors
3. Open Network tab → look for failed requests
4. Check if token is valid: localStorage.getItem('token')
5. If token is null: login didn't save token (CORS issue)
```

---

## Verify Your URLs Are Correct

Before closing, double-check:

```
Frontend (Vercel):
  https://palmeraie-XXXXX.vercel.app
  
Backend (Railway):  
  https://palmeraie-backend-prod-XXXXX.railway.app
  
In frontend/index.html:
  window.ENV.API_BASE = 'https://palmeraie-backend-prod-XXXXX.railway.app'
  
In Railway Variables:
  CORS_ORIGINS = 'https://palmeraie-XXXXX.vercel.app'
```

All URLs should have:
- ✅ `https://` (not http)
- ✅ No trailing `/` at the end
- ✅ Exact domain names (no typos)

---

## Keep These Urls Saved

```
Frontend Deploy: https://palmeraie-XXXXX.vercel.app
Backend Deploy:  https://palmeraie-backend-prod-XXXXX.railway.app
Admin Login:     admin / admin123
```

**Next**: Change the default admin password! 🔐

---

## You're Done! 🚀

Everything is now connected. Users can:
1. Open your Vercel frontend
2. Log in with credentials
3. See live data from Railway backend
4. Create/edit/delete inventory items
5. View analytics

The system is **live and production-ready**! 🎉
