@echo off
REM Stop Enclave v2 Memory Service (keeps data)

echo Stopping Enclave v2 Memory Service...
docker compose -f docker-compose.v2.yml down

echo.
echo Stopped. Data volumes preserved.
echo To remove data as well, run: docker compose -f docker-compose.v2.yml down -v
