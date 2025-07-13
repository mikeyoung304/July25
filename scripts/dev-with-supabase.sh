#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Grow Fresh Local Food Development Environment${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo -e "${YELLOW}Please install it with: npm install -g supabase${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Not in project root directory${NC}"
    echo "Please run this script from the project root"
    exit 1
fi

# Check Supabase login status
echo -e "${BLUE}Checking Supabase authentication...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  You're not logged in to Supabase${NC}"
    echo -e "${YELLOW}Please run: supabase login${NC}"
    echo ""
    echo "After logging in, run this script again."
    exit 1
fi

echo -e "${GREEN}✅ Logged in to Supabase${NC}"

# Check if project is linked
echo -e "${BLUE}Checking project link status...${NC}"
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo -e "${YELLOW}⚠️  Project not linked to Supabase${NC}"
    echo -e "${YELLOW}Linking to project: xiwfhcikfdoshxwbtjxt${NC}"
    supabase link --project-ref xiwfhcikfdoshxwbtjxt
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to link project${NC}"
        echo "Please check your Supabase project reference"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Project linked${NC}"

# Check for pending migrations
echo -e "${BLUE}Checking for pending migrations...${NC}"
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)

if [ $MIGRATION_COUNT -gt 0 ]; then
    echo -e "${YELLOW}Found $MIGRATION_COUNT migration file(s)${NC}"
    echo -e "${BLUE}Would you like to apply migrations now? (y/n)${NC}"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Applying migrations...${NC}"
        supabase db push
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Migrations applied successfully${NC}"
        else
            echo -e "${RED}❌ Migration failed${NC}"
            echo "You can try applying them manually later with: supabase db push"
        fi
    else
        echo -e "${YELLOW}Skipping migrations${NC}"
        echo "You can apply them later with: supabase db push"
    fi
else
    echo -e "${GREEN}✅ No migrations found${NC}"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm run install:all
fi

# Start the development servers
echo ""
echo -e "${GREEN}🎉 Starting development servers...${NC}"
echo -e "${BLUE}Frontend: http://localhost:5173${NC}"
echo -e "${BLUE}Backend: http://localhost:3001${NC}"
echo ""

npm run dev