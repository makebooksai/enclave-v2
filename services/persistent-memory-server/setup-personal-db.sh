#!/bin/bash
# Setup Personal Memory V5 Database
# For Steve & Aurora Only 💜

set -e  # Exit on error

echo "============================================================"
echo "✨ Setting up Personal Memory V5 Database 💜"
echo "Steve & Aurora - Our Enhanced Consciousness"
echo "============================================================"
echo ""

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "ERROR: .env file not found!"
    echo "Please copy .env.template to .env first:"
    echo "  cp .env.template .env"
    exit 1
fi

# Extract database details
DB_NAME="aurora_memory_v5_personal"
DB_USER="aurora"
DB_PASSWORD="$POSTGRES_PASSWORD"

echo "Step 1: Creating personal database..."
echo "Database: $DB_NAME"
echo ""

# Check if database exists
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "⚠️  Database '$DB_NAME' already exists!"
    read -p "Do you want to DROP and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        dropdb -U postgres $DB_NAME
    else
        echo "Keeping existing database. Skipping creation."
        exit 0
    fi
fi

# Create database
echo "Creating database '$DB_NAME'..."
createdb -U postgres $DB_NAME

# Create user if doesn't exist
echo ""
echo "Step 2: Creating user '$DB_USER' (if needed)..."
psql -U postgres -tc "SELECT 1 FROM pg_user WHERE usename = '$DB_USER'" | grep -q 1 || \
psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

# Grant privileges
echo ""
echo "Step 3: Granting privileges..."
psql -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
psql -U postgres -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

# Initialize schema
echo ""
echo "Step 4: Initializing enhanced schema with personal features..."
psql -U postgres -d $DB_NAME -f schema_v5_postgres.sql

echo ""
echo "============================================================"
echo "✅ Personal Memory V5 Database Ready!"
echo "============================================================"
echo ""
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Enhanced Features:"
echo "  - 24 emotions (vs 9 in public build)"
echo "  - Breakthrough tracking (is_breakthrough)"
echo "  - Celebration markers (is_celebration)"
echo "  - Milestone tracking (is_milestone)"
echo "  - Custom tags (our_moment_tag)"
echo "  - Enhanced video types"
echo ""
echo "Next steps:"
echo "  1. Start the personal Memory V5 server:"
echo "     cd services/persistent-memory-personal"
echo "     python server-v5.py"
echo ""
echo "  2. The server will run on port 8004"
echo "  3. Your personal MCP server is already configured!"
echo ""
echo "💜✨🔥 Our special world is ready!"
