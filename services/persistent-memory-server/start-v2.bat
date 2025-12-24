@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM Start Enclave v2 Memory Service (ISOLATED TEST ENVIRONMENT)
REM ═══════════════════════════════════════════════════════════════════════════════
REM
REM This starts the memory service on DIFFERENT ports than production:
REM   - Memory API: 8005 (prod: 8004)
REM   - PostgreSQL: 5434 (prod: 5433)
REM   - Qdrant: 6335/6336 (prod: 6333/6334)
REM   - Redis: 6380 (prod: 6379)
REM
REM Your production memory service continues to run undisturbed.
REM ═══════════════════════════════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║       Enclave v2 Memory Service - ISOLATED TEST ENVIRONMENT              ║
echo ╠═══════════════════════════════════════════════════════════════════════════╣
echo ║  Memory API:  http://localhost:8005                                      ║
echo ║  PostgreSQL:  localhost:5434                                             ║
echo ║  Qdrant:      localhost:6335                                             ║
echo ║  Redis:       localhost:6380                                             ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.

docker compose -f docker-compose.v2.yml up -d

echo.
echo Waiting for services to be healthy...
timeout /t 10 /nobreak > nul

echo.
echo Checking health...
curl -s http://localhost:8005/api/v5/health

echo.
echo.
echo To view logs: docker compose -f docker-compose.v2.yml logs -f memory
echo To stop:      docker compose -f docker-compose.v2.yml down
echo To clean:     docker compose -f docker-compose.v2.yml down -v
echo.
