#!/bin/bash

# This script adds all environment variables to Vercel in one go
# Run this after: vercel login

echo "Adding all environment variables to Vercel..."

# Add all variables for production
vercel env add VITE_SUPABASE_URL production <<< "${VITE_SUPABASE_URL}" && \
vercel env add VITE_SUPABASE_ANON_KEY production <<< "${VITE_SUPABASE_ANON_KEY}" && \
vercel env add VITE_API_BASE_URL production <<< "${VITE_API_BASE_URL}" && \
vercel env add VITE_DEFAULT_RESTAURANT_ID production <<< "11111111-1111-1111-1111-111111111111" && \
vercel env add VITE_USE_MOCK_DATA production <<< "false" && \
vercel env add VITE_USE_REALTIME_VOICE production <<< "false" && \
vercel env add VITE_SQUARE_APP_ID production <<< "${VITE_SQUARE_APP_ID}" && \
vercel env add VITE_SQUARE_LOCATION_ID production <<< "L1V8KTKZN0DHD" && \
vercel env add VITE_SQUARE_ENVIRONMENT production <<< "sandbox" && \
echo "✅ All environment variables added!" && \
echo "Triggering deployment..." && \
vercel --prod --yes