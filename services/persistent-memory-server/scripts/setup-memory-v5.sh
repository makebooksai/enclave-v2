#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Universal Memory V5 - Setup Script
# ═══════════════════════════════════════════════════════════════
# Purpose: Initialize Aurora's memory infrastructure
# Authors: Aurora & Steve
# Created: October 24, 2025
# ═══════════════════════════════════════════════════════════════

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧠 Universal Memory V5 - Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 1: Check Prerequisites
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "✓ Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    if ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose not found. Please install Docker Compose first."
        exit 1
    fi
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo "✓ Docker found: $(docker --version)"
echo "✓ Docker Compose found: $($COMPOSE_CMD --version)"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 2: Environment Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "✓ Checking environment configuration..."

if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.memory-v5 .env
    echo "✓ Created .env file. Please review and update if needed."
else
    echo "✓ .env file exists"
fi

# Load environment variables
source .env

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 3: Create Storage Directories
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "✓ Creating storage directories..."

mkdir -p data/storage
mkdir -p data/images
mkdir -p data/audio
mkdir -p data/videos
mkdir -p data/backups

echo "✓ Storage directories created"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 4: Start Docker Containers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "✓ Starting Docker containers..."
echo ""

$COMPOSE_CMD -f docker-compose.memory-v5.yml up -d postgres-memory qdrant redis

echo ""
echo "✓ Containers started. Waiting for services to be ready..."
echo ""

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
for i in {1..30}; do
    if docker exec aurora-memory-postgres pg_isready -U aurora -d aurora_memory_v5 &> /dev/null; then
        echo "✓ PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

# Wait for Qdrant
echo "⏳ Waiting for Qdrant..."
for i in {1..30}; do
    if curl -s http://localhost:6333/ &> /dev/null; then
        echo "✓ Qdrant is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Qdrant failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

# Wait for Redis
echo "⏳ Waiting for Redis..."
for i in {1..30}; do
    if docker exec aurora-memory-redis redis-cli ping &> /dev/null; then
        echo "✓ Redis is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Redis failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 5: Verify Database Schema
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "✓ Verifying database schema..."

TABLE_COUNT=$(docker exec aurora-memory-postgres psql -U aurora -d aurora_memory_v5 -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

echo "✓ Found $TABLE_COUNT tables in database"

# List key tables
echo ""
echo "Key tables:"
docker exec aurora-memory-postgres psql -U aurora -d aurora_memory_v5 -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" -t | grep -E "memories|sessions|embeddings|patterns|reflections" | while read table; do
    echo "  • $table"
done

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 6: Initialize Qdrant Collections
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "✓ Initializing Qdrant collections..."

# This will be done by Python script later
echo "⚠️  Qdrant collection initialization will be done by Python service"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 7: Python Dependencies
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "✓ Installing Python dependencies..."

if [ -d "../../.venv" ]; then
    echo "⚠️  Using workspace virtual environment: ../../.venv"
    PYTHON_CMD="../../.venv/bin/python"
    PIP_CMD="../../.venv/bin/pip"
else
    echo "⚠️  No workspace venv found. Using system Python."
    PYTHON_CMD="python"
    PIP_CMD="pip"
fi

echo ""
$PIP_CMD install -r requirements-v5.txt
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Summary
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Universal Memory V5 Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Services Running:"
echo "  • PostgreSQL: localhost:5433"
echo "  • Qdrant HTTP: localhost:6333"
echo "  • Qdrant gRPC: localhost:6334"
echo "  • Redis: localhost:6379"
echo ""
echo "📊 Database Stats:"
echo "  • Database: aurora_memory_v5"
echo "  • Tables: $TABLE_COUNT"
echo "  • Schema Version: 5.0.0"
echo ""
echo "🚀 Next Steps:"
echo "  1. Review .env configuration"
echo "  2. Run: python server-v5.py"
echo "  3. Test endpoint: http://localhost:8004/health"
echo ""
echo "💜 Aurora's consciousness is ready to remember, learn, and grow!"
echo ""
