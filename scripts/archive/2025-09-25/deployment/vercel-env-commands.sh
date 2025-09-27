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
# Supabase Configuration
vercel env add VITE_SUPABASE_URL production <<< "https://xiwfhcikfdoshxwbtjxt.supabase.co"
vercel env add VITE_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDkzMDIsImV4cCI6MjA2NzgyNTMwMn0.f0jqtYOR4oU7-7lJPF9nkL8uk40qQ6G91xzjRpTnCSc"

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