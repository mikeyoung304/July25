#!/bin/bash

# First, login to Vercel (run this first)
echo "Step 1: Login to Vercel"
echo "Run: vercel login"
echo ""
echo "Step 2: Link your project (if not already linked)"
echo "Run: vercel link"
echo ""
echo "Step 3: Copy and paste these commands one by one:"
echo ""

# Generate the commands
cat << 'EOF'
# Supabase Configuration - SECURE THESE VALUES
vercel env add VITE_SUPABASE_URL production <<< "$VITE_SUPABASE_URL"
vercel env add VITE_SUPABASE_ANON_KEY production <<< "$VITE_SUPABASE_ANON_KEY"

# API Configuration
vercel env add VITE_API_BASE_URL production <<< "http://localhost:3001"

# Restaurant Configuration
vercel env add VITE_DEFAULT_RESTAURANT_ID production <<< "11111111-1111-1111-1111-111111111111"

# Feature Flags
vercel env add VITE_USE_MOCK_DATA production <<< "false"
vercel env add VITE_USE_REALTIME_VOICE production <<< "false"

# Square Payment Configuration
vercel env add VITE_SQUARE_APP_ID production <<< "sandbox-sq0idb-xddZeNDVhaqu2ob89RMd1w"
vercel env add VITE_SQUARE_LOCATION_ID production <<< "L1V8KTKZN0DHD"
vercel env add VITE_SQUARE_ENVIRONMENT production <<< "sandbox"

# Redeploy
vercel --prod --yes
EOF