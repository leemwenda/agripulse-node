@echo off
REM ─────────────────────────────────────────────────────────────
REM  AgriPulse v2 — Setup Script (Windows)
REM  Run this once after extracting the project zip.
REM  Usage: Double-click setup.bat OR run it in CMD
REM ─────────────────────────────────────────────────────────────

echo.
echo ================================================
echo    AgriPulse v2 — Project Setup (Windows)
echo ================================================
echo.

REM ── 1. Check we're in the right folder ───────────────────────
if not exist "package.json" (
  echo [ERROR] Run this script from the agripulse-v2 project folder.
  echo         cd into the folder first, then run setup.bat
  pause
  exit /b 1
)

REM ── 2. Copy .env if not already present ──────────────────────
if exist ".env" (
  echo [!] .env already exists — skipping. Edit it manually if needed.
) else (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo [!] .env created from .env.example.
  ) else (
    echo [ERROR] .env.example not found. Place your .env file in this folder.
    pause
    exit /b 1
  )
)

REM ── 3. Install server dependencies ───────────────────────────
echo.
echo [1/4] Installing server dependencies...
call npm install
if errorlevel 1 ( echo [ERROR] npm install failed. & pause & exit /b 1 )

REM ── 4. Install client dependencies ───────────────────────────
echo.
echo [2/4] Installing client dependencies...
cd client
call npm install
if errorlevel 1 ( echo [ERROR] Client npm install failed. & pause & exit /b 1 )
cd ..

REM ── 5. Generate Prisma client ─────────────────────────────────
echo.
echo [3/4] Generating Prisma client...
call npx prisma generate
if errorlevel 1 ( echo [ERROR] Prisma generate failed. & pause & exit /b 1 )

REM ── 6. Push DB schema ─────────────────────────────────────────
echo.
echo [4/4] Pushing database schema...
echo       (Make sure DATABASE_URL is set correctly in .env)
call npx prisma db push
if errorlevel 1 ( echo [ERROR] DB push failed. Check your DATABASE_URL in .env & pause & exit /b 1 )

REM ── 7. Done ───────────────────────────────────────────────────
echo.
echo ================================================
echo    Setup complete!
echo ================================================
echo.
echo   Start the app:   npm run dev
echo   DB Studio:       npm run db:studio
echo.
echo   REMINDER: Make sure DATABASE_URL in .env is
echo   set to your real MySQL credentials!
echo.
pause
