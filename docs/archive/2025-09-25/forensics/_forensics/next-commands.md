# Next Commands to Fix Deployment

## Step 1: Fix Node Version Compatibility
```bash
# Edit package.json to relax Node version requirement
git checkout main
git pull origin main

# Change engines.node from "20.x" to ">=18.0.0"
sed -i '' 's/"node": "20.x"/"node": ">=18.0.0"/' package.json

# Remove packageManager specification
sed -i '' '/"packageManager":/d' package.json

# Commit the fix
git add package.json
git commit -m "fix(deploy): relax Node version requirement for providers

- Change from Node 20.x to >=18.0.0 for Vercel/Render compatibility
- Remove packageManager specification that requires Node 20+"

git push origin main
```

## Step 2: If Step 1 Doesn't Work - Check Provider Settings
```bash
# For Vercel
vercel env pull
cat .env.local  # Check what env vars Vercel has

# Check Vercel Node version
vercel --version
vercel inspect [deployment-url]  # Get deployment details
```

## Step 3: Add Missing Env Vars to Render
Log into Render dashboard and add these environment variables:
- DEVICE_FINGERPRINT_SALT = (generate a random string)
- KIOSK_JWT_SECRET = (generate a random JWT secret)
- PIN_PEPPER = (generate a random string)
- SQUARE_APP_ID = (get from Square dashboard)
- STATION_TOKEN_SECRET = (generate a random string)
- SUPABASE_JWT_SECRET = (get from Supabase dashboard)
- OPENAI_API_KEY = (get from OpenAI)

## Step 4: Alternative - Force Node 20 on Providers
If you want to keep Node 20:

### For Vercel:
Add to vercel.json:
```json
{
  "functions": {
    "api/**/*": {
      "runtime": "nodejs20.x"
    }
  }
}
```

### For Render:
Already set in render.yaml with NODE_VERSION=20

## Step 5: Debug Build Locally with Node 18
```bash
# Install Node 18 to test
nvm install 18
nvm use 18

# Run the exact commands from providers
npm ci --workspaces
npm run build --workspace shared
npm run build --workspace client
npm run build --workspace server
```