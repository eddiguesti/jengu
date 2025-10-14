# Streamlit Removal Plan

**Created:** 2025-10-14
**Status:** DRAFT - Awaiting approval before execution
**Objective:** Remove all Streamlit-related code while preserving React SPA and Python backend functionality

---

## Executive Summary

This project contains **4 non-functional Streamlit apps** (~4,167 lines) with broken imports referencing a non-existent `apps.ui` module. These apps were likely "vibe coded" prototypes that are no longer needed since the React frontend exists.

**Safe to remove:** All Streamlit code is isolated and doesn't affect the working React SPA or core Python business logic.

---

## Impact Analysis

### ✅ **SAFE - Will Continue Working**
- ✅ React frontend (`frontend/`) - Uses Vite + React, completely independent
- ✅ Node.js backend (`backend/server.js`) - Express API for React app
- ✅ Core Python engine (`core/`) - **Zero Streamlit dependencies found**
- ✅ Data files (`data/`) - Parquet, CSV, JSON data
- ✅ Python packages (pandas, fastapi, scikit-learn, etc.)

### ❌ **WILL BE REMOVED - Non-functional/Broken**
- ❌ 4 Streamlit apps with broken imports
- ❌ Streamlit documentation (outdated)
- ❌ Streamlit Docker configs
- ❌ Heroku Procfile (Streamlit-specific)

---

## Files to Remove

### 1. **Streamlit Applications** (4 files, ~4,167 lines)

```bash
neon_app.py             # ~528 lines - Neon theme UI (broken imports)
lime_app.py             # ~49KB - Lime theme UI (broken imports)
streamlit_app.py        # ~11KB - Default UI (broken imports)
jengu_app.py            # ~21KB - Jengu variant (broken imports)
```

**Why broken:** All import from `apps.ui.neon_theme` and `apps.ui.setup_wizard` which don't exist.

### 2. **Helper/Temp Files** (2 files)

```bash
appsui_icons.py         # Empty placeholder file (1 byte)
insights_temp.py        # Temporary Streamlit test file (~20KB)
```

### 3. **Documentation** (28 markdown files referencing Streamlit)

#### **Primary Streamlit Docs** (Should be removed)
```bash
RUN_STREAMLIT.md                    # Streamlit-specific instructions
README_PREMIUM_UI.md                # Streamlit UI docs
README_INTELLIGENT.md               # Streamlit intelligent features
NEON_README.md                      # Neon theme docs
QUICKSTART.md                       # Streamlit quickstart
QUICK_START.md                      # Duplicate quickstart
QUICK_START_INTELLIGENT.md          # Intelligent quickstart
```

#### **Mixed Content Docs** (Update to remove Streamlit references)
```bash
README.md                           # Main readme (mentions Streamlit, keep file)
ARCHITECTURE.md                     # Architecture docs (mentions both UIs)
SETUP_GUIDE.md                      # Setup instructions
START_HERE.md                       # Getting started
PROJECT_SUMMARY.md                  # Project overview
DEPLOYMENT.md                       # Deployment guide
INTEGRATION_GUIDE.md                # Integration docs
```

#### **Historical/Status Docs** (Keep as-is for history)
```bash
WHATS_NEW.md                        # Changelog (historical)
UPGRADE_SUMMARY.md                  # Upgrade history
SYSTEM_STATUS.md                    # Status reports
PHASE_*_COMPLETE.md                 # Phase completion docs
GIT_REMOVED_SUMMARY.md              # Previous cleanup history
CLEANUP_SUMMARY.md                  # Cleanup history
```

### 4. **Configuration Files**

```bash
Procfile                            # Heroku config - Streamlit-specific
runtime.txt                         # Python runtime - might be needed for core
```

**Note:** `runtime.txt` should be kept if Python backend needs it, removed if only for Streamlit.

### 5. **Docker Configuration**

```bash
infra/docker/Dockerfile.ui          # Streamlit Docker image
```

**Update:**
```bash
infra/docker/docker-compose.yml     # Remove 'ui' service section
```

### 6. **Build Files**

**Update `Makefile`:**
- Remove `run-ui` target (line 37-38)
- Keep `run-api` target

### 7. **Dependencies**

**Update `requirements.txt`:**
- Remove: `streamlit==1.50.0` (line 8)
- Keep: All other dependencies (pandas, fastapi, scikit-learn, etc.)

---

## Files to Update (Not Remove)

### `README.md`
**Changes:**
- Remove Streamlit quickstart section
- Update "Run Streamlit UI" instructions to "Run React Frontend"
- Update architecture diagram
- Remove Streamlit screenshots

### `ARCHITECTURE.md`
**Changes:**
- Remove Streamlit layer from architecture diagram
- Update to show React → Node.js → Python core
- Remove `apps/ui/streamlit_app.py` references

### `Makefile`
**Remove:**
```makefile
run-ui:
	streamlit run apps/ui/streamlit_app.py
```

**Keep:**
```makefile
run-api:
	uvicorn apps.api.main:app --reload --host 0.0.0.0 --port 8000
```

### `infra/docker/docker-compose.yml`
**Remove:**
- `ui:` service (lines 41-55)
- Port mapping `8501:8501`

**Keep:**
- `postgres` service
- `api` service

### `.gitignore` (if exists)
**Add:**
```
# Removed Streamlit artifacts
*.pyc
__pycache__/
.streamlit/
```

---

## Verification Checklist

After removal, verify these still work:

### ✅ **React Frontend**
```bash
cd frontend
pnpm install
pnpm run dev
# Should start on http://localhost:3000
```

### ✅ **Node.js Backend**
```bash
cd backend
pnpm install
pnpm start
# Should start on http://localhost:8000
```

### ✅ **Python Core**
```bash
python3 -c "from core.analysis.correlations import compute_correlations; print('✓ Core imports work')"
python3 -c "from core.connectors.weather import WeatherConnector; print('✓ Weather connector works')"
python3 -c "from core.models.business_profile import BusinessProfileManager; print('✓ Models work')"
```

### ✅ **Python Tests**
```bash
pytest tests/ -v
# All tests should pass
```

---

## Execution Plan

### Phase 1: Backup (Safety First)
```bash
# Create backup branch
git checkout -b backup/before-streamlit-removal
git push origin backup/before-streamlit-removal

# Or create archive
tar -czf jengu-backup-$(date +%Y%m%d).tar.gz .
```

### Phase 2: Remove Streamlit Apps
```bash
rm -f neon_app.py
rm -f lime_app.py
rm -f streamlit_app.py
rm -f jengu_app.py
rm -f appsui_icons.py
rm -f insights_temp.py
```

### Phase 3: Remove Streamlit Documentation
```bash
rm -f RUN_STREAMLIT.md
rm -f README_PREMIUM_UI.md
rm -f README_INTELLIGENT.md
rm -f NEON_README.md
rm -f QUICKSTART.md
rm -f QUICK_START.md
rm -f QUICK_START_INTELLIGENT.md
```

### Phase 4: Remove Docker/Config
```bash
rm -f Procfile
rm -f infra/docker/Dockerfile.ui
# Update docker-compose.yml (manual edit)
# Update Makefile (manual edit)
```

### Phase 5: Update Dependencies
```bash
# Edit requirements.txt to remove streamlit==1.50.0
# Then reinstall
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Phase 6: Update Documentation
```bash
# Manually update:
# - README.md
# - ARCHITECTURE.md
# - SETUP_GUIDE.md
# - PROJECT_SUMMARY.md
```

### Phase 7: Verify
```bash
# Test React frontend
cd frontend && pnpm run dev

# Test Node backend
cd backend && pnpm start

# Test Python core
pytest tests/

# Test imports
python3 -c "from core.analysis.correlations import compute_correlations"
```

### Phase 8: Commit
```bash
git add -A
git commit -m "Remove non-functional Streamlit code

- Removed 4 broken Streamlit apps (~4,167 lines)
- Removed Streamlit documentation (7 files)
- Removed Streamlit Docker config
- Removed streamlit dependency from requirements.txt
- Updated architecture docs to reflect React-only frontend
- Verified React SPA and Python core still functional"
```

---

## Risk Assessment

### 🟢 **Low Risk**
- Streamlit apps have broken imports and can't run
- No imports of Streamlit found in `core/` modules
- React frontend is completely independent
- Node.js backend doesn't use Python

### 🟡 **Medium Risk**
- Documentation might reference Streamlit features that don't exist in React app
- Future developers might be confused about missing features mentioned in docs

### 🔴 **High Risk**
- None identified

---

## Rollback Plan

If something breaks:

```bash
# Option 1: Restore from git
git checkout backup/before-streamlit-removal
git checkout -b main

# Option 2: Restore specific file
git checkout backup/before-streamlit-removal -- neon_app.py

# Option 3: Restore from archive
tar -xzf jengu-backup-YYYYMMDD.tar.gz
```

---

## Disk Space Savings

- **Streamlit apps:** ~90 KB
- **Streamlit docs:** ~180 KB
- **Streamlit dependency:** ~15 MB (when installed)
- **Total saved:** ~15.3 MB

Not massive, but cleaner codebase = easier maintenance.

---

## Post-Removal TODOs

1. ✅ Verify React app works
2. ✅ Verify Node backend works
3. ✅ Verify Python core works
4. ✅ Update README with correct getting started
5. ✅ Update architecture diagrams
6. ⬜ Consider creating `FRONTEND.md` for React-specific docs
7. ⬜ Consider creating `BACKEND.md` for Node.js API docs
8. ⬜ Update `.github/workflows/` if CI/CD exists

---

## Questions Before Execution

1. **Keep `runtime.txt`?**
   - Yes if Python backend uses Heroku
   - No if only Streamlit used it

2. **Keep historical docs mentioning Streamlit?**
   - Recommend: Yes, for historical context
   - Alternative: Move to `docs/archive/`

3. **Remove cleanup scripts?**
   - `cleanup.sh`, `cleanup.ps1`, `cleanup-no-git.ps1` already try to remove Streamlit
   - These can stay as they're not harmful

---

## Conclusion

**Ready to proceed?** This removal is **safe** and **low-risk**. The Streamlit apps are non-functional prototypes that serve no purpose now that the React SPA exists.

**Estimated time:** 15-20 minutes
**Complexity:** Low (mostly deletions)
**Reversibility:** High (git rollback available)

---

**Awaiting approval to execute Phase 1-8.** 🚀
