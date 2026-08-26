# ORBIMOD — PowerShell Automated Git Push
param(
    [string]$Message = "Auto-sync OrbiMod: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  🚀 ORBIMOD — AUTO-SYNC GIT PUSH A GITHUB" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Preparando cambios (git add .)..." -ForegroundColor Yellow
git add .

Write-Host "[2/3] Creando commit: '$Message'..." -ForegroundColor Yellow
try {
    git commit -m "$Message"
} catch {
    Write-Host "ℹ️ No hay cambios pendientes para commit." -ForegroundColor Gray
}

Write-Host "[3/3] Enviando cambios al repositorio (git push origin main)..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ ¡Sincronización completada con éxito en GitHub!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error al hacer git push. Revisa tu conexión o permisos." -ForegroundColor Red
}
Write-Host "========================================================" -ForegroundColor Cyan
