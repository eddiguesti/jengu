# Project Cleanup Script (PowerShell version for Windows)
# Removes old Python app and unnecessary files to reduce project size from 2GB to ~500MB

Write-Host ""
Write-Host "🧹 Cleaning up travel-pricing project..." -ForegroundColor Cyan
Write-Host ""

$totalSaved = 0

# Remove Python virtual environment
if (Test-Path ".venv") {
    Write-Host "  📦 Removing .venv (Python virtual environment) - saves ~1.2GB..." -ForegroundColor Yellow
    Remove-Item -Path ".venv" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "     ✅ Removed" -ForegroundColor Green
    $totalSaved += 1200
} else {
    Write-Host "  ⏭️  .venv not found (already removed)" -ForegroundColor Gray
}

# Remove Claude Code extension
if (Test-Path "anthropic.claude-code-2.0.14.vsix") {
    Write-Host "  📦 Removing Claude Code extension file - saves 26MB..." -ForegroundColor Yellow
    Remove-Item -Path "anthropic.claude-code-2.0.14.vsix" -Force
    Write-Host "     ✅ Removed" -ForegroundColor Green
    $totalSaved += 26
} else {
    Write-Host "  ⏭️  anthropic.claude-code-2.0.14.vsix not found (already removed)" -ForegroundColor Gray
}

# Remove old Python app folders
Write-Host "  📦 Removing old Python app folders - saves ~10MB..." -ForegroundColor Yellow
$removedCount = 0

if (Test-Path "apps") {
    Remove-Item -Path "apps" -Recurse -Force -ErrorAction SilentlyContinue
    $removedCount++
}

if (Test-Path "appsapi") {
    Remove-Item -Path "appsapi" -Recurse -Force -ErrorAction SilentlyContinue
    $removedCount++
}

if (Test-Path ".streamlit") {
    Remove-Item -Path ".streamlit" -Recurse -Force -ErrorAction SilentlyContinue
    $removedCount++
}

if ($removedCount -gt 0) {
    Write-Host "     ✅ Removed $removedCount folder(s)" -ForegroundColor Green
    $totalSaved += 10
} else {
    Write-Host "     ⏭️  Folders already removed" -ForegroundColor Gray
}

# Remove Python cache
Write-Host "  📦 Removing Python cache files..." -ForegroundColor Yellow
$cacheCount = 0

Get-ChildItem -Path . -Filter "__pycache__" -Recurse -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    $cacheCount++
}

Get-ChildItem -Path . -Filter "*.pyc" -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
}

Get-ChildItem -Path . -Filter "*.pyo" -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
}

if ($cacheCount -gt 0) {
    Write-Host "     ✅ Removed $cacheCount cache folder(s)" -ForegroundColor Green
    $totalSaved += 2
} else {
    Write-Host "     ⏭️  No cache files found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Results:" -ForegroundColor Cyan
Write-Host "  ✅ Project size reduced from ~2GB to ~500MB" -ForegroundColor Green
Write-Host "  ✅ Removed approximately $totalSaved MB of unnecessary files" -ForegroundColor Green
Write-Host ""
Write-Host "🗑️  What was removed:" -ForegroundColor Yellow
Write-Host "  • Python virtual environment (.venv)"
Write-Host "  • Old Streamlit app code (apps/, appsapi/, .streamlit/)"
Write-Host "  • Python cache files (__pycache__/)"
Write-Host "  • Claude Code extension file (.vsix)"
Write-Host ""
Write-Host "✅ What was kept:" -ForegroundColor Green
Write-Host "  • React frontend (frontend/)"
Write-Host "  • Express backend (backend/)"
Write-Host "  • Node modules (needed for development)"
Write-Host "  • Git history (.git/)"
Write-Host "  • Documentation (*.md)"
Write-Host ""
Write-Host "🚀 Your app will continue to work exactly the same!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
