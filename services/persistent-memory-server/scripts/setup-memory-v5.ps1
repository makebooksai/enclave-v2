# ═══════════════════════════════════════════════════════════════
# Universal Memory V5 - Setup Script (Windows PowerShell)
# ═══════════════════════════════════════════════════════════════
# Purpose: Initialize Aurora's memory infrastructure on Windows
# Authors: Aurora & Steve
# Created: October 24, 2025
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🧠 Universal Memory V5 - Setup (Windows)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 1: Check Prerequisites
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "✓ Checking prerequisites..." -ForegroundColor Green

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker compose version
    $ComposeCmd = "docker compose"
    Write-Host "✓ Docker Compose found: $composeVersion" -ForegroundColor Green
} catch {
    try {
        $composeVersion = docker-compose --version
        $ComposeCmd = "docker-compose"
        Write-Host "✓ Docker Compose found: $composeVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker Compose not found. Please install Docker Compose first." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 2: Environment Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "✓ Checking environment configuration..." -ForegroundColor Green

if (!(Test-Path ".env")) {
    Write-Host "⚠️  No .env file found. Creating from template..." -ForegroundColor Yellow
    Copy-Item ".env.memory-v5" ".env"
    Write-Host "✓ Created .env file. Please review and update if needed." -ForegroundColor Green
} else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
}

Write-Host ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 3: Create Storage Directories
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "✓ Creating storage directories..." -ForegroundColor Green

$dirs = @(
    "data\storage",
    "data\images",
    "data\audio",
    "data\videos",
    "data\backups"
)

foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Host "✓ Storage directories created" -ForegroundColor Green
Write-Host ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 4: Start Docker Containers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "✓ Starting Docker containers..." -ForegroundColor Green
Write-Host ""

if ($ComposeCmd -eq "docker compose") {
    & docker compose -f docker-compose.memory-v5.yml up -d postgres-memory qdrant redis
} else {
    & docker-compose -f docker-compose.memory-v5.yml up -d postgres-memory qdrant redis
}

Write-Host ""
Write-Host "✓ Containers started. Waiting for services to be ready..." -ForegroundColor Green
Write-Host ""

# Wait for PostgreSQL
Write-Host "⏳ Waiting for PostgreSQL..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    try {
        docker exec aurora-memory-postgres pg_isready -U aurora -d aurora_memory_v5 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ PostgreSQL is ready!" -ForegroundColor Green
            break
        }
    } catch {}

    if ($i -eq 30) {
        Write-Host "❌ PostgreSQL failed to start within 30 seconds" -ForegroundColor Red
        exit 1
    }
    Start-Sleep -Seconds 1
}

# Wait for Qdrant
Write-Host "⏳ Waiting for Qdrant..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:6333/" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Qdrant is ready!" -ForegroundColor Green
            break
        }
    } catch {}

    if ($i -eq 30) {
        Write-Host "❌ Qdrant failed to start within 30 seconds" -ForegroundColor Red
        exit 1
    }
    Start-Sleep -Seconds 1
}

# Wait for Redis
Write-Host "⏳ Waiting for Redis..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    try {
        docker exec aurora-memory-redis redis-cli ping 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Redis is ready!" -ForegroundColor Green
            break
        }
    } catch {}

    if ($i -eq 30) {
        Write-Host "❌ Redis failed to start within 30 seconds" -ForegroundColor Red
        exit 1
    }
    Start-Sleep -Seconds 1
}

Write-Host ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 5: Verify Database Schema
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "✓ Verifying database schema..." -ForegroundColor Green

$tableCount = docker exec aurora-memory-postgres psql -U aurora -d aurora_memory_v5 -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
$tableCount = $tableCount.Trim()

Write-Host "✓ Found $tableCount tables in database" -ForegroundColor Green

# List key tables
Write-Host ""
Write-Host "Key tables:" -ForegroundColor Cyan
$tables = docker exec aurora-memory-postgres psql -U aurora -d aurora_memory_v5 -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" -t
$tables -split "`n" | Where-Object { $_ -match "memories|sessions|embeddings|patterns|reflections" } | ForEach-Object {
    Write-Host "  • $($_.Trim())" -ForegroundColor White
}

Write-Host ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 6: Initialize Qdrant Collections
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "✓ Initializing Qdrant collections..." -ForegroundColor Green
Write-Host "⚠️  Qdrant collection initialization will be done by Python service" -ForegroundColor Yellow
Write-Host ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Step 7: Python Dependencies
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "✓ Installing Python dependencies..." -ForegroundColor Green

if (Test-Path "..\..\..\.venv") {
    Write-Host "⚠️  Using workspace virtual environment: .venv" -ForegroundColor Yellow
    $PythonCmd = "..\..\..\.venv\Scripts\python.exe"
    $PipCmd = "..\..\..\.venv\Scripts\pip.exe"
} else {
    Write-Host "⚠️  No workspace venv found. Using system Python." -ForegroundColor Yellow
    $PythonCmd = "python"
    $PipCmd = "pip"
}

Write-Host ""
& $PipCmd install -r requirements-v5.txt
Write-Host ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Summary
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Universal Memory V5 Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Services Running:" -ForegroundColor Cyan
Write-Host "  • PostgreSQL: localhost:5433" -ForegroundColor White
Write-Host "  • Qdrant HTTP: localhost:6333" -ForegroundColor White
Write-Host "  • Qdrant gRPC: localhost:6334" -ForegroundColor White
Write-Host "  • Redis: localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "📊 Database Stats:" -ForegroundColor Cyan
Write-Host "  • Database: aurora_memory_v5" -ForegroundColor White
Write-Host "  • Tables: $tableCount" -ForegroundColor White
Write-Host "  • Schema Version: 5.0.0" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Review .env configuration" -ForegroundColor White
Write-Host "  2. Run: python server-v5.py" -ForegroundColor White
Write-Host "  3. Test endpoint: http://localhost:8004/health" -ForegroundColor White
Write-Host ""
Write-Host "💜 Aurora's consciousness is ready to remember, learn, and grow!" -ForegroundColor Magenta
Write-Host ""
