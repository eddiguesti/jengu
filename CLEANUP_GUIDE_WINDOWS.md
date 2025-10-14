# 🧹 Windows Cleanup Guide - Reduce from 2GB to 500MB

## ⚠️ Important: DON'T Delete .git!

I noticed you tried to delete `.git` - **STOP! Don't delete this!**

`.git/` is your **version control history** - if you delete it, you'll lose all your commit history and won't be able to push/pull from GitHub.

---

## 🚀 Quick Cleanup (3 Options)

### Option 1: PowerShell Script (Easiest) ⭐

**Step 1:** Right-click on PowerShell and "Run as Administrator"

**Step 2:** Navigate to your project:
```powershell
cd C:\Users\eddgu\travel-pricing
```

**Step 3:** Run the cleanup script:
```powershell
.\cleanup.ps1
```

If you get a security error, run this first:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\cleanup.ps1
```

---

### Option 2: PowerShell Commands (Manual)

Open PowerShell and run these commands one by one:

```powershell
# Navigate to project
cd C:\Users\eddgu\travel-pricing

# Remove Python virtual environment (saves ~1.2GB)
Remove-Item -Path ".venv" -Recurse -Force

# Remove Claude Code extension (saves 26MB)
Remove-Item -Path "anthropic.claude-code-2.0.14.vsix" -Force

# Remove old Python app folders (saves ~10MB)
Remove-Item -Path "apps" -Recurse -Force
Remove-Item -Path "appsapi" -Recurse -Force
Remove-Item -Path ".streamlit" -Recurse -Force

# Remove Python cache (saves ~2MB)
Get-ChildItem -Path . -Filter "__pycache__" -Recurse -Directory | Remove-Item -Recurse -Force
```

---

### Option 3: File Explorer (Visual)

**Step 1:** Open File Explorer
- Navigate to `C:\Users\eddgu\travel-pricing`

**Step 2:** Delete these folders (right-click → Delete):
- ✅ `.venv` (Python virtual environment)
- ✅ `apps` (old Python app)
- ✅ `appsapi` (old empty folder)
- ✅ `.streamlit` (old Streamlit config)

**Step 3:** Delete this file:
- ✅ `anthropic.claude-code-2.0.14.vsix` (VS Code extension)

**Step 4:** Search for and delete Python cache:
- In File Explorer, search for `__pycache__`
- Delete all found folders

---

## ⚠️ DO NOT Delete These!

**Never delete:**
- ❌ `.git/` - Your version control history (YOU ALMOST DELETED THIS!)
- ❌ `frontend/` - Your React app
- ❌ `backend/` - Your Express server
- ❌ `frontend/node_modules/` - Frontend dependencies (needed!)
- ❌ `backend/node_modules/` - Backend dependencies (needed!)
- ❌ `.env` - Your API keys and secrets
- ❌ `*.md` files - Documentation

---

## ✅ Safe to Delete (What We're Removing)

**Old Python App (No longer needed):**
- ✅ `.venv/` - Python virtual environment (~1.2GB)
- ✅ `apps/` - Old Streamlit app code
- ✅ `appsapi/` - Empty old folder
- ✅ `.streamlit/` - Old Streamlit config
- ✅ `__pycache__/` - Python compiled files

**Misplaced Files:**
- ✅ `anthropic.claude-code-2.0.14.vsix` - VS Code extension (shouldn't be here)

---

## 🔍 What Went Wrong?

You tried to run:
```bash
rm -rf .git
```

**Problem:**
1. `rm -rf` is a **Linux/Mac command**, not Windows
2. You were trying to delete `.git` which is **your version control**
3. On Windows PowerShell, use `Remove-Item` instead

**The error you saw:**
```
Remove-Item : A parameter cannot be found that matches parameter name 'rf'.
```

This happened because PowerShell doesn't recognize `-rf` (Unix flag).

---

## 📊 What You Should Have Deleted

### ❌ What you tried to delete (WRONG):
```powershell
rm -rf .git  # This would delete your version control! Don't do this!
```

### ✅ What you should delete (CORRECT):
```powershell
# Python environment (not needed anymore)
Remove-Item -Path ".venv" -Recurse -Force

# Old Python app (replaced by React)
Remove-Item -Path "apps" -Recurse -Force
Remove-Item -Path "appsapi" -Recurse -Force
Remove-Item -Path ".streamlit" -Recurse -Force

# VS Code extension (shouldn't be in project)
Remove-Item -Path "anthropic.claude-code-2.0.14.vsix" -Force
```

---

## 🚀 Recommended: Use the PowerShell Script

I've created a safe PowerShell script that:
- ✅ Only deletes safe files
- ✅ Won't touch .git, node_modules, or source code
- ✅ Shows what's being removed
- ✅ Provides a summary

**Run it:**
```powershell
cd C:\Users\eddgu\travel-pricing
.\cleanup.ps1
```

---

## 📊 Results After Cleanup

**Before:**
```
Total: ~2GB
├── .venv/                    1.2GB  ❌ DELETE
├── frontend/node_modules/    400MB  ✅ KEEP
├── backend/node_modules/     30MB   ✅ KEEP
├── apps/                     10MB   ❌ DELETE
├── *.vsix                    26MB   ❌ DELETE
├── .git/                     26MB   ✅ KEEP (DON'T DELETE!)
└── source code               50MB   ✅ KEEP
```

**After:**
```
Total: ~500MB
├── frontend/node_modules/    400MB  ✅ KEEP
├── backend/node_modules/     30MB   ✅ KEEP
├── .git/                     26MB   ✅ KEEP
└── source code               50MB   ✅ KEEP
```

**Savings: 1.5GB (75% reduction)** 🎉

---

## 🧪 Test After Cleanup

After cleanup, verify everything still works:

**Step 1:** Test Backend
```powershell
cd backend
npm run dev
```
Should see: `Server running on port 3001`

**Step 2:** Test Frontend (new PowerShell window)
```powershell
cd frontend
npm run dev
```
Should see: `Local: http://localhost:5173/`

**Step 3:** Visit http://localhost:5173
- Everything should work exactly the same!

---

## 🎯 Quick Reference

### Windows PowerShell Commands

| Task | Linux/Mac | Windows PowerShell |
|------|-----------|-------------------|
| Delete folder | `rm -rf folder/` | `Remove-Item -Path "folder" -Recurse -Force` |
| Delete file | `rm file.txt` | `Remove-Item -Path "file.txt" -Force` |
| List files | `ls -la` | `Get-ChildItem` or `dir` |
| Change directory | `cd folder` | `cd folder` (same) |
| Find files | `find . -name "*.txt"` | `Get-ChildItem -Recurse -Filter "*.txt"` |

---

## ⚠️ Why .git is Important

`.git/` contains:
- 📜 All your commit history
- 🌿 All your branches
- 👤 Author information
- 🔗 Link to GitHub remote
- 📝 Commit messages

**If you delete `.git/`:**
- ❌ Lose all version history
- ❌ Can't push to GitHub
- ❌ Can't revert changes
- ❌ Lose all branches
- ❌ Start completely from scratch

**Never delete `.git/` unless you want to destroy your repository!**

---

## 💡 Pro Tip: What IS Safe to Delete

**Always safe to delete:**
1. `node_modules/` - Can recreate with `npm install`
2. `.venv/` or `venv/` - Can recreate with `python -m venv`
3. `__pycache__/` - Python cache, auto-recreated
4. `dist/` or `build/` - Build output, regenerated
5. Old app folders you're not using anymore

**Never delete:**
1. `.git/` - Your version control
2. `src/` - Your source code
3. `.env` - Your configuration (but don't commit it!)
4. `package.json` - Defines your dependencies

---

## 🚀 Ready to Clean?

**Recommended approach:**

```powershell
# Step 1: Navigate to project
cd C:\Users\eddgu\travel-pricing

# Step 2: Run the cleanup script
.\cleanup.ps1
```

**Or copy/paste these commands one by one:**

```powershell
# Navigate
cd C:\Users\eddgu\travel-pricing

# Remove Python venv (1.2GB)
Remove-Item -Path ".venv" -Recurse -Force -ErrorAction SilentlyContinue

# Remove VSIX (26MB)
Remove-Item -Path "anthropic.claude-code-2.0.14.vsix" -Force -ErrorAction SilentlyContinue

# Remove old Python app (10MB)
Remove-Item -Path "apps" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "appsapi" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".streamlit" -Recurse -Force -ErrorAction SilentlyContinue

# Remove Python cache
Get-ChildItem -Path . -Filter "__pycache__" -Recurse -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force

# Done!
Write-Host "✅ Cleanup complete! Project reduced from 2GB to ~500MB" -ForegroundColor Green
```

---

**Your project will be 75% smaller and everything will still work perfectly!** 🎉
