# Backend Deployment Guide

## Current Issue
Your Vercel frontend shows mock data because it's trying to connect to `localhost:3001`. You need to deploy your backend to a public URL.

## Recommended: Deploy to Render (Free & Easy)

### Step 1: Deploy Backend to Render

1. **Go to [Render Dashboard](https://dashboard.render.com)** and sign up/login

2. **Click "New +" → "Web Service"**

3. **Connect your GitHub repository** (rebuild-6.0)

4. **Configure the service:**
   - **Name:** `grow-fresh-backend`
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

5. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):
   ```
   NODE_ENV=production
   PORT=3001
   
   # Copy these from your .env file:
   SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDkzMDIsImV4cCI6MjA2NzgyNTMwMn0.f0jqtYOR4oU7-7lJPF9nkL8uk40qQ6G91xzjRpTnCSc
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI0OTMwMiwiZXhwIjoyMDY3ODI1MzAyfQ.-dXq_uGiXmBQRKTz22LBWya2YBqVXLgZ41oLTdhnB5g
   DATABASE_URL=postgresql://postgres:bf43D86obVkgyaKJ@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres?sslmode=require
   
   # AI settings:
   OPENAI_API_KEY=your-openai-api-key
   DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
   
   # Square payments:
   SQUARE_ACCESS_TOKEN=EAAAl0B9Dc8dvpuk5G3gpAHxHiShdBDHB3EvjPwh8nr-7VUB5IwVLC-2DJ899X_0
   SQUARE_ENVIRONMENT=sandbox
   SQUARE_LOCATION_ID=L1V8KTKZN0DHD
   
   # Update this after deployment:
   FRONTEND_URL=https://grow-git-main-mikeyoung304-gmailcoms-projects.vercel.app
   ```

6. **Click "Create Web Service"** and wait for deployment (~5 minutes)

7. **Copy your backend URL** (will be something like `https://grow-fresh-backend.onrender.com`)

### Step 2: Update Vercel Frontend

1. **Go to your [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Select your project** (grow)

3. **Go to Settings → Environment Variables**

4. **Add/Update this variable:**
   ```
   VITE_API_BASE_URL=https://grow-fresh-backend.onrender.com
   ```
   (Replace with your actual Render URL from Step 1)

5. **Redeploy your Vercel project:**
   - Go to Deployments tab
   - Click the three dots on the latest deployment
   - Click "Redeploy"

### Step 3: Verify It's Working

1. **Test your backend:**
   ```bash
   curl https://grow-fresh-backend.onrender.com/api/v1/menu
   ```
   Should return your real menu items (BLT Sandwich, etc.)

2. **Check your Vercel site:**
   - Should now show real menu items instead of "Classic Burger" and "Caesar Salad"
   - Check browser console for any errors

## Alternative: Deploy Backend to Railway
1. Go to [Render](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Set root directory to `/server`
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Add the same environment variables as above
8. Deploy and get your URL

### 4. Alternative: Use Vercel Functions (More Complex)
This requires converting your Express backend to serverless functions. Not recommended for your current architecture.

## Testing Production
Once deployed:
1. Your backend should be accessible at `https://your-backend-url/api/v1/health`
2. Your frontend at Vercel should connect to the backend without CORS errors
3. Check browser console for any connection issues

## Important Notes
- The backend MUST be deployed to a public URL for Vercel frontend to access it
- localhost URLs don't work in production
- Make sure to add your production domains to CORS allowed origins
- Keep your service keys secure and never commit them to Git