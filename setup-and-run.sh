#!/bin/bash

echo "🚀 Setting up Prism Backend..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Stop system PostgreSQL (requires sudo)
echo -e "${YELLOW}Step 1: Stopping system PostgreSQL...${NC}"
sudo pkill postgres || echo "No system PostgreSQL to stop"
sleep 2

# Step 2: Start Docker services
echo -e "${YELLOW}Step 2: Starting Docker PostgreSQL and Redis...${NC}"
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
sleep 10

# Step 3: Run database migrations
echo -e "${YELLOW}Step 3: Running database migrations...${NC}"
npm run prisma:migrate -- --name init

# Step 4: Generate Prisma client
echo -e "${YELLOW}Step 4: Generating Prisma client...${NC}"
npm run prisma:generate

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${GREEN}📝 To start the backend, run: npm run dev${NC}"
echo ""
echo -e "${YELLOW}📋 Mock Credentials:${NC}"
echo -e "   To create a test account, visit: ${GREEN}http://localhost:8080/auth${NC}"
echo -e "   Or register via API: ${GREEN}POST http://localhost:5000/api/v1/auth/register${NC}"
echo ""
echo -e "   Example registration:"
echo -e "   Email: ${GREEN}test@example.com${NC}"
echo -e "   Username: ${GREEN}testuser${NC}"
echo -e "   Password: ${GREEN}Test123!${NC}"
