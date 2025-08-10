#!/bin/bash

# Setup Vercel Environment Variables
# This script adds all required environment variables to your Vercel project

echo "🚀 Setting up Vercel environment variables..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Set environment variables for production, preview, and development
echo "📝 Adding environment variables to Vercel..."

# Supabase Configuration
vercel env add VITE_SUPABASE_URL production preview development <<< "https://xiwfhcikfdoshxwbtjxt.supabase.co"
vercel env add VITE_SUPABASE_ANON_KEY production preview development <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDkzMDIsImV4cCI6MjA2NzgyNTMwMn0.f0jqtYOR4oU7-7lJPF9nkL8uk40qQ6G91xzjRpTnCSc"

# API Configuration (you may want to update this for production)
vercel env add VITE_API_BASE_URL production preview development <<< "http://localhost:3001"

# Restaurant Configuration
vercel env add VITE_DEFAULT_RESTAURANT_ID production preview development <<< "11111111-1111-1111-1111-111111111111"

# Feature Flags
vercel env add VITE_USE_MOCK_DATA production preview development <<< "false"
vercel env add VITE_USE_REALTIME_VOICE production preview development <<< "false"

# Square Payment Configuration (Sandbox)
vercel env add VITE_SQUARE_APP_ID production preview development <<< "sandbox-sq0idb-xddZeNDVhaqu2ob89RMd1w"
vercel env add VITE_SQUARE_LOCATION_ID production preview development <<< "L1V8KTKZN0DHD"
vercel env add VITE_SQUARE_ENVIRONMENT production preview development <<< "sandbox"

echo "✅ Environment variables added successfully!"
echo ""
echo "📦 Triggering a new deployment..."
vercel --prod

echo ""
echo "🎉 Setup complete! Your app should now be deployed with all environment variables."
echo ""
echo "⚠️  Note: You may want to update VITE_API_BASE_URL to point to your deployed backend"
echo "    instead of localhost:3001 for production use."