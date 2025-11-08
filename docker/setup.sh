#!/bin/bash

# ΨNet Local Development Environment Setup
# This script sets up a complete local development environment

set -e

echo "🚀 Setting up ΨNet Local Development Environment..."
echo ""

# Colors for output
GREEN='\033[0.32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✓ Dependencies already installed"
fi

echo ""
echo -e "${BLUE}🐳 Starting Docker containers...${NC}"
docker-compose up -d

echo ""
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"

# Wait for Hardhat
echo -n "  Hardhat: "
until docker-compose exec -T hardhat nc -z localhost 8545 2>/dev/null; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✓${NC}"

# Wait for IPFS
echo -n "  IPFS:    "
until docker-compose exec -T ipfs ipfs id 2>/dev/null; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✓${NC}"

# Wait for PostgreSQL
echo -n "  Postgres:"
until docker-compose exec -T postgres pg_isready -U psinet 2>/dev/null; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✓${NC}"

# Wait for Redis
echo -n "  Redis:   "
until docker-compose exec -T redis redis-cli ping 2>/dev/null; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✓${NC}"

echo ""
echo -e "${BLUE}📝 Compiling contracts...${NC}"
npx hardhat compile

echo ""
echo -e "${BLUE}🚀 Deploying contracts to local network...${NC}"
npx hardhat run scripts/deploy.js --network localhost

echo ""
echo -e "${GREEN}✅ ΨNet Local Environment Ready!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🌐 Service URLs:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  📡 Hardhat RPC:        http://localhost:8545"
echo "  📦 IPFS API:           http://localhost:5001"
echo "  🌍 IPFS Gateway:       http://localhost:8080"
echo "  🗄️  PostgreSQL:         localhost:5432"
echo "  💾 Redis:              localhost:6379"
echo "  📊 The Graph:          http://localhost:8000"
echo "  📈 Grafana:            http://localhost:3000"
echo "  🔍 Prometheus:         http://localhost:9090"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🔑 Credentials:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Grafana:    admin / psinet_dev"
echo "  PostgreSQL: psinet / psinet_dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📚 Quick Commands:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Run tests:         npm test"
echo "  Integration tests: npm run test:integration"
echo "  Deploy contracts:  npx hardhat run scripts/deploy.js --network localhost"
echo "  View logs:         docker-compose logs -f [service]"
echo "  Stop environment:  docker-compose down"
echo "  Reset environment: docker-compose down -v && ./docker/setup.sh"
echo ""
echo -e "${YELLOW}💡 Tip: Run 'npm run dev' to start watching for changes${NC}"
echo ""
