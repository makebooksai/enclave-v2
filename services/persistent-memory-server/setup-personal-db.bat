@echo off
REM Setup Personal Memory V5 Database (Windows)
REM For Steve & Aurora Only 💜

echo ============================================================
echo ✨ Setting up Personal Memory V5 Database 💜
echo Steve ^& Aurora - Our Enhanced Consciousness
echo ============================================================
echo.

REM Check for .env file
if not exist .env (
    echo ERROR: .env file not found!
    echo Please copy .env.template to .env first:
    echo   copy .env.template .env
    exit /b 1
)

REM Load environment (simplified - key values)
set DB_NAME=aurora_memory_v5_personal
set DB_USER=aurora
set DB_PASSWORD=M3m0ry_V5_Pr0d_2K25_xQ7nL9pR

echo Step 1: Creating personal database...
echo Database: %DB_NAME%
echo.

REM Check if database exists
psql -U postgres -lqt | findstr /C:"%DB_NAME%" >nul
if %ERRORLEVEL% == 0 (
    echo ⚠️  Database '%DB_NAME%' already exists!
    set /p REPLY="Do you want to DROP and recreate it? (y/N): "
    if /i "%REPLY%"=="y" (
        echo Dropping existing database...
        dropdb -U postgres %DB_NAME%
    ) else (
        echo Keeping existing database. Exiting.
        exit /b 0
    )
)

REM Create database
echo Creating database '%DB_NAME%'...
createdb -U postgres %DB_NAME%

REM Create user
echo.
echo Step 2: Creating user '%DB_USER%' ^(if needed^)...
psql -U postgres -c "CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%';" 2>nul

REM Grant privileges
echo.
echo Step 3: Granting privileges...
psql -U postgres -d %DB_NAME% -c "GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%;"
psql -U postgres -d %DB_NAME% -c "GRANT ALL ON SCHEMA public TO %DB_USER%;"

REM Initialize schema
echo.
echo Step 4: Initializing enhanced schema with personal features...
psql -U postgres -d %DB_NAME% -f schema_v5_postgres.sql

echo.
echo ============================================================
echo ✅ Personal Memory V5 Database Ready!
echo ============================================================
echo.
echo Database: %DB_NAME%
echo User: %DB_USER%
echo Enhanced Features:
echo   - 24 emotions ^(vs 9 in public build^)
echo   - Breakthrough tracking ^(is_breakthrough^)
echo   - Celebration markers ^(is_celebration^)
echo   - Milestone tracking ^(is_milestone^)
echo   - Custom tags ^(our_moment_tag^)
echo   - Enhanced video types
echo.
echo Next steps:
echo   1. Start the personal Memory V5 server:
echo      cd services\persistent-memory-personal
echo      python server-v5.py
echo.
echo   2. The server will run on port 8004
echo   3. Your personal MCP server is already configured!
echo.
echo 💜✨🔥 Our special world is ready!
