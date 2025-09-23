#!/bin/bash

echo "🚀 Setting Vercel Production Environment Variables"
echo "================================================"
echo ""
echo "This script will add all required environment variables to Vercel."
echo "Make sure you're logged in to Vercel CLI first."
echo ""

# Check if logged in
if ! vercel whoami > /dev/null 2>&1; then
    echo "❌ You're not logged in to Vercel CLI"
    echo "Please run: vercel login"
    exit 1
fi

echo "✅ Logged in as: $(vercel whoami)"
echo ""
echo "Adding environment variables..."

# Add each variable
vercel env add VITE_API_BASE_URL production <<< "https://july25.onrender.com"
echo "✅ Added VITE_API_BASE_URL"

vercel env add VITE_SUPABASE_URL production <<< "https://xiwfhcikfdoshxwbtjxt.supabase.co"
echo "✅ Added VITE_SUPABASE_URL"

vercel env add VITE_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDkzMDIsImV4cCI6MjA2NzgyNTMwMn0.f0jqtYOR4oU7-7lJPF9nkL8uk40qQ6G91xzjRpTnCSc"
echo "✅ Added VITE_SUPABASE_ANON_KEY"

vercel env add VITE_DEFAULT_RESTAURANT_ID production <<< "11111111-1111-1111-1111-111111111111"
echo "✅ Added VITE_DEFAULT_RESTAURANT_ID"

vercel env add VITE_USE_MOCK_DATA production <<< "false"
echo "✅ Added VITE_USE_MOCK_DATA"

vercel env add VITE_USE_REALTIME_VOICE production <<< "true"
echo "✅ Added VITE_USE_REALTIME_VOICE"

vercel env add VITE_SQUARE_APP_ID production <<< "demo"
echo "✅ Added VITE_SQUARE_APP_ID"

vercel env add VITE_SQUARE_LOCATION_ID production <<< "demo"
echo "✅ Added VITE_SQUARE_LOCATION_ID"

vercel env add VITE_SQUARE_ENVIRONMENT production <<< "sandbox"
echo "✅ Added VITE_SQUARE_ENVIRONMENT"

vercel env add VITE_DEBUG_VOICE production <<< "false"
echo "✅ Added VITE_DEBUG_VOICE"

vercel env add VITE_DEMO_PANEL production <<< "false"
echo "✅ Added VITE_DEMO_PANEL"

vercel env add VITE_ENABLE_PERF production <<< "false"
echo "✅ Added VITE_ENABLE_PERF"

echo ""
echo "✅ All environment variables have been added!"
echo ""
echo "Next steps:"
echo "1. Trigger a new deployment: vercel --prod"
echo "2. Check deployment status: vercel ls"
echo "3. View logs: vercel logs [deployment-url]"
echo ""
echo "🎉 Environment setup complete!"