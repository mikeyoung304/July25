#!/bin/bash

# This script adds all environment variables to Vercel in one go
# Run this after: vercel login

echo "Adding all environment variables to Vercel..."

# Add all variables for production
vercel env add VITE_SUPABASE_URL production <<< "https://xiwfhcikfdoshxwbtjxt.supabase.co" && \
vercel env add VITE_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDkzMDIsImV4cCI6MjA2NzgyNTMwMn0.f0jqtYOR4oU7-7lJPF9nkL8uk40qQ6G91xzjRpTnCSc" && \
vercel env add VITE_API_BASE_URL production <<< "https://api.mike.app.buildpanel.ai" && \
vercel env add VITE_DEFAULT_RESTAURANT_ID production <<< "11111111-1111-1111-1111-111111111111" && \
vercel env add VITE_USE_MOCK_DATA production <<< "false" && \
vercel env add VITE_USE_REALTIME_VOICE production <<< "false" && \
vercel env add VITE_SQUARE_APP_ID production <<< "sandbox-sq0idb-xddZeNDVhaqu2ob89RMd1w" && \
vercel env add VITE_SQUARE_LOCATION_ID production <<< "L1V8KTKZN0DHD" && \
vercel env add VITE_SQUARE_ENVIRONMENT production <<< "sandbox" && \
echo "✅ All environment variables added!" && \
echo "Triggering deployment..." && \
vercel --prod --yes