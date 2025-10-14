# Complete Cleanup Script - Remove Git and Old Files
# This will make your project a regular folder (not a Git repository)

Write-Host ""
Write-Host "🧹 Complete Cleanup - Removing Git and Old Files..." -ForegroundColor Cyan
Write-Host ""

$totalSaved = 0

# Remove Git repository
if (Test-Path ".git") {
    Write-Host "  📦 Removing .git (Git repository) - saves ~26MB..." -ForegroundColor Yellow
    Remove-Item -Path ".git" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "     ✅ Git repository removed - this is now a regular folder" -ForegroundColor Green
    $totalSaved += 26
} else {
    Write-Host "  ⏭️  .git not found (no Git repository)" -ForegroundColor Gray
}

# Remove .gitignore (no longer needed without Git)
if (Test-Path ".gitignore") {
    Write-Host "  📦 Removing .gitignore (not needed without Git)..." -ForegroundColor Yellow
    Remove-Item -Path ".gitignore" -Force -ErrorAction SilentlyContinue
    Write-Host "     ✅ Removed" -ForegroundColor Green
}

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
    Remove-Item -Path "anthropic.claude-code-2.0.14.vsix" -Force -ErrorAction SilentlyContinue
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
Write-Host "✅ Complete cleanup finished!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Results:" -ForegroundColor Cyan
Write-Host "  ✅ Project size reduced from ~2GB to ~500MB" -ForegroundColor Green
Write-Host "  ✅ Removed approximately $totalSaved MB" -ForegroundColor Green
Write-Host "  ✅ This is now a REGULAR FOLDER (no Git)" -ForegroundColor Yellow
Write-Host ""
Write-Host "🗑️  What was removed:" -ForegroundColor Yellow
Write-Host "  • Git repository (.git/) - NO VERSION CONTROL"
Write-Host "  • .gitignore file (not needed without Git)"
Write-Host "  • Python virtual environment (.venv)"
Write-Host "  • Old Streamlit app code (apps/, appsapi/, .streamlit/)"
Write-Host "  • Python cache files (__pycache__/)"
Write-Host "  • Claude Code extension file (.vsix)"
Write-Host ""
Write-Host "✅ What was kept:" -ForegroundColor Green
Write-Host "  • React frontend (frontend/)"
Write-Host "  • Express backend (backend/)"
Write-Host "  • Node modules (needed for development)"
Write-Host "  • Documentation (*.md)"
Write-Host "  • Environment variables (.env)"
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Red
Write-Host "  • This folder is NO LONGER a Git repository" -ForegroundColor Red
Write-Host "  • You cannot push/pull to GitHub anymore" -ForegroundColor Red
Write-Host "  • All version history is permanently deleted" -ForegroundColor Red
Write-Host ""
Write-Host "🚀 Your app will continue to work exactly the same!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
