# Environment Variables Setup Guide

## Overview
This project uses environment variables to manage sensitive configuration like API endpoints, database URLs, and security keys. This prevents hardcoding secrets in code and makes it easy to deploy to different environments.

## How It Works

### Frontend
- **config.js** - Loads the API base URL from:
  - `window.ENV.API_BASE` (injected by server)
  - Falls back to `http://localhost:8000` for development
  
- api.js and login.html now use `API_BASE` instead of hardcoded URLs

### Backend (already implemented)
- **auth.py** - Reads `SECRET_KEY` from `os.environ.get("SECRET_KEY", "...")`
- Uses JWT tokens with configurable expiration
- Password hashing with bcrypt (not stored in plaintext)

## Configuration Files

### `.env` (Git ignored ❌ - DO NOT COMMIT)
- Contains **actual** sensitive values for your environment
- Never commit this to Git
- Create this file locally with your real secrets

### `.env.example` (Git included ✅ - Safe to commit)
- Template showing all available variables
- Use as a reference for setup
- Safe to share publicly

## Files Modified

| File | Changes |
|------|---------|
| `frontend/config.js` | ✨ NEW - Loads API_BASE from environment |
| `frontend/api.js` | Removed hardcoded API URL |
| `frontend/login.html` | Removed hardcoded API URL, loads config.js |
| `frontend/index.html` | Added `<script src="config.js"></script>` |
| `.env` | New - Contains actual configuration (gitignored) |
| `.env.example` | New - Safe template (commited to git) |

## Environment Variables Reference

### Frontend
| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_BASE` | API endpoint URL | `https://api.example.com` or `http://localhost:8000` |

### Backend  
| Variable | Purpose | Example | Default |
|----------|---------|---------|---------|
| `SECRET_KEY` | JWT signing key | Random string, 32+ chars | `palmeraie-secret-change-in-production` |
| `ALGORITHM` | JWT algorithm | `HS256` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_HOURS` | Token expiration time | `12` | `12` |
| `BACKEND_PORT` | Server port | `8000` | `8000` |
| `BACKEND_HOST` | Server host | `0.0.0.0` | `0.0.0.0` |
| `DATABASE_URL` | Database path | `sqlite:///./palmeraie.db` | `sqlite:///./palmeraie.db` |
| `CORS_ORIGINS` | Allowed origins | `https://example.com,https://app.example.com` | `*` |

## Local Development Setup

### 1. Create `.env` file
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Edit `.env` with local values
```env
VITE_API_BASE=http://localhost:8000
SECRET_KEY=my-development-secret-key
# ... other variables
```

### 3. Start the backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

### 4. Start the frontend
Open `frontend/index.html` in a browser. The app will use `API_BASE=http://localhost:8000`

## Production Deployment

### Important Security Steps

1. **Generate a new SECRET_KEY**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Set environment variables on your hosting platform**
   - Railway: Dashboard → Variables
   - Vercel: Project Settings → Environment Variables
   - Docker: Use `--env` flag or `.env` file in container
   - Traditional server: Set in `.bashrc`, systemd, or nginx config

3. **Update CORS_ORIGINS**
   ```env
   # Only allow your actual domain
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

4. **Change default admin credentials**
   ```env
   DEFAULT_ADMIN_USERNAME=your-username
   DEFAULT_ADMIN_PASSWORD=your-password
   ```
   Or change them through the admin panel after first login.

5. **Update VITE_API_BASE**
   ```env
   VITE_API_BASE=https://api.yourdomain.com
   ```

### Deployment Examples

#### Railway
1. In Railway Dashboard, go to Variables
2. Add each variable from `.env`:
   ```
   SECRET_KEY=<your-generated-key>
   VITE_API_BASE=https://palmeraie-stocks-production-8ae8.up.railway.app
   ```

#### Docker
Create a production `.env` and pass to container:
```bash
docker run --env-file .env myapp:latest
```

#### Traditional Server (Ubuntu/Debian)
```bash
# Edit systemd service file
sudo nano /etc/systemd/system/palmeraie.service

# Add environment variables
Environment="SECRET_KEY=..."
Environment="VITE_API_BASE=..."

sudo systemctl restart palmeraie
```

## Security Checklist

- [ ] Never commit `.env` file to Git
- [ ] `.env.example` committed, `.env` in `.gitignore`
- [ ] Generated NEW `SECRET_KEY` for production (not the default)
- [ ] Changed default admin password
- [ ] Set `CORS_ORIGINS` to specific domains (not `*`)
- [ ] Database URL points to correct location
- [ ] Backend and frontend URLs match
- [ ] Tested authentication in target environment

## Troubleshooting

### "Cannot find module 'config.js'" or "API_BASE is not defined"
- Ensure `config.js` is loaded **before** `api.js` in the HTML
- Check that the `<script src="config.js"></script>` tag is present in index.html and login.html

### Frontend cannot reach backend API
- Check `VITE_API_BASE` matches your backend URL
- Verify backend CORS settings allow your frontend domain
- Check browser console for CORS errors

### JWT token errors in backend
- Ensure `SECRET_KEY` is set and consistent
- Check `ACCESS_TOKEN_EXPIRE_HOURS` is reasonable
- Verify time sync on server (log expiration issues)

## Next Steps

1. ✅ Delete any hardcoded secrets from source code (Done)
2. ✅ Create `.env.example` template (Done)
3. ⏳ Create `.env` with your real values locally
4. ⏳ Update production deployment with new environment variables
5. ⏳ Add `.env` to `.gitignore` (if not already)

