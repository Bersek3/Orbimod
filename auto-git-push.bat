@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================================
echo   🚀 ORBIMOD — AUTO-SYNC GIT PUSH A GITHUB
echo ========================================================
echo.

set COMMIT_MSG=%*
if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=Auto-sync OrbiMod: %date% %time%
)

echo [1/3] Preparando cambios (git add .)...
git add .

echo [2/3] Creando commit: "%COMMIT_MSG%"...
git commit -m "%COMMIT_MSG%"

echo [3/3] Enviando a origin main (git push)...
git push origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ✅ ¡Sincronizacion completada con exito en GitHub!
) else (
    echo ❌ Ocurrio un error al hacer push. Verifica tu conexion o credenciales.
)
echo ========================================================
pause
