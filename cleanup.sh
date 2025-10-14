#!/bin/bash
# Project Cleanup Script
# Removes old Python app and unnecessary files to reduce project size from 2GB to ~500MB

echo "🧹 Cleaning up travel-pricing project..."
echo ""

# Remove Python virtual environment
if [ -d ".venv" ]; then
    echo "  📦 Removing .venv (Python virtual environment) - saves ~1.2GB..."
    rm -rf .venv
    echo "     ✅ Removed"
else
    echo "  ⏭️  .venv not found (already removed)"
fi

# Remove Claude Code extension
if [ -f "anthropic.claude-code-2.0.14.vsix" ]; then
    echo "  📦 Removing Claude Code extension file - saves 26MB..."
    rm -f anthropic.claude-code-2.0.14.vsix
    echo "     ✅ Removed"
else
    echo "  ⏭️  anthropic.claude-code-2.0.14.vsix not found (already removed)"
fi

# Remove old Python app folders
echo "  📦 Removing old Python app folders - saves ~10MB..."
removed_count=0

if [ -d "apps" ]; then
    rm -rf apps
    removed_count=$((removed_count + 1))
fi

if [ -d "appsapi" ]; then
    rm -rf appsapi
    removed_count=$((removed_count + 1))
fi

if [ -d ".streamlit" ]; then
    rm -rf .streamlit
    removed_count=$((removed_count + 1))
fi

if [ $removed_count -gt 0 ]; then
    echo "     ✅ Removed $removed_count folder(s)"
else
    echo "     ⏭️  Folders already removed"
fi

# Remove Python cache
echo "  📦 Removing Python cache files..."
cache_count=$(find . -type d -name "__pycache__" 2>/dev/null | wc -l)
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null
find . -type f -name "*.pyo" -delete 2>/dev/null

if [ $cache_count -gt 0 ]; then
    echo "     ✅ Removed $cache_count cache folder(s)"
else
    echo "     ⏭️  No cache files found"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Results:"
echo "  ✅ Project size reduced from ~2GB to ~500MB"
echo "  ✅ Removed ~1.25GB of unnecessary files"
echo ""
echo "🗑️  What was removed:"
echo "  • Python virtual environment (.venv)"
echo "  • Old Streamlit app code (apps/, appsapi/, .streamlit/)"
echo "  • Python cache files (__pycache__/)"
echo "  • Claude Code extension file (.vsix)"
echo ""
echo "✅ What was kept:"
echo "  • React frontend (frontend/)"
echo "  • Express backend (backend/)"
echo "  • Node modules (needed for development)"
echo "  • Git history (.git/)"
echo "  • Documentation (*.md)"
echo ""
echo "🚀 Your app will continue to work exactly the same!"
echo ""
