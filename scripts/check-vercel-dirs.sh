#!/bin/bash
# Check for rogue .vercel directories that cause duplicate projects

ROGUE_VERCELS=$(find . -name ".vercel" -type d | grep -v "^\.\/.vercel$" | head -5)

if [ ! -z "$ROGUE_VERCELS" ]; then
  echo "❌ ERROR: Found .vercel directories in subdirectories:"
  echo "$ROGUE_VERCELS"
  echo ""
  echo "These will cause duplicate Vercel projects!"
  echo "Please remove them: rm -rf client/.vercel server/.vercel shared/.vercel"
  exit 1
fi

echo "✅ No rogue .vercel directories found"