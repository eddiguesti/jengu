# Complete Documentation Map

All markdown files have been organized into proper folders.

---

## 📂 Directory Structure

### Root Level (Only Essential Files)

```
/
├── CLAUDE.md          # AI assistant instructions (required by Claude Code)
├── AGENTS.md          # AI agent configurations
├── GEMINI.md          # Gemini AI assistant config
└── README.md          # Main project README
```

**Total:** 4 files (down from 9+)

---

### 📁 `/docs/` - Documentation Hub

```
docs/
├── README.md                    # Docs overview
├── setup/                       # Setup & Configuration
├── developer/                   # Technical Documentation
├── components/                  # Component Documentation
├── references/                  # Reference Documents
├── cleanup/                     # Cleanup Reports
├── verification/                # Data Verification
├── guides/                      # User Guides
├── project-summaries/           # Project Status
├── completion-reports/          # Task Reports
├── audits/                      # Code Audits
├── sessions/                    # Session Notes
├── monitoring/                  # Monitoring Docs
└── archive/                     # Historical Docs
```

---

## 📋 Documentation by Category

### `/docs/setup/` - Setup & Configuration
**Purpose:** Getting started guides and API setup

**Files:**
- `API-KEYS-REQUIRED.md` - List of required API keys
- `API-SETUP-QUICKSTART.md` - Quick setup guide
- `CTouvert-API-Request-Email.md` - API request correspondence

**Use When:** Setting up the project for the first time

---

### `/docs/developer/` - Technical Documentation
**Purpose:** Detailed technical documentation for developers

**Architecture & System:**
- `ARCHITECTURE.md` - Detailed system architecture
- `TECHNICAL-ARCHITECTURE.md` - Main architecture overview

**Development:**
- `CODE_QUALITY.md` - Linting, formatting, type checking
- `FRONTEND_STYLING.md` - Frontend styling guide
- `LIGHT-THEME-DESIGN-SYSTEM.md` - UI design system

**Features:**
- `COMPETITOR_DATA.md` - Competitor scraping documentation
- `CSV_MAPPER.md` - CSV column mapping system
- `ENRICHMENT.md` - Data enrichment pipeline
- `PRICING_ENGINE_SETUP.md` - Pricing engine setup
- `PRICING-ENGINE-QUICKSTART.md` - Quick start for pricing engine

**Infrastructure:**
- `DB_PARTITIONING_RUNBOOK.md` - Database partitioning guide
- `GRPC_SETUP.md` - gRPC configuration
- `QUEUE_SYSTEM.md` - BullMQ job queue system
- `SUPABASE_SECURITY.md` - Security patterns and RLS

**Advanced Features:**
- `DIRECTOR_DASHBOARD.md` - Director dashboard features
- `LEARNING_LOOP.md` - ML learning loop
- `LIGHTGBM_ELASTICITY_PRICING.md` - Elasticity pricing models
- `OBSERVABILITY.md` - Monitoring and logging
- `OPENAPI.md` - OpenAPI documentation
- `PREDICTION_MODELS_DATA_FLOW.md` - ML model data flows
- `SMART_ALERTS.md` - Alert system documentation

**Total:** 20+ files

**Use When:** Building features, understanding architecture, debugging

---

### `/docs/components/` - Component Documentation
**Purpose:** Individual component specifications

**Files:**
- `PRICING-CALENDAR-COMPONENT.md` - Calendar component documentation

**Use When:** Working with specific UI components

---

### `/docs/references/` - Reference Documents
**Purpose:** Complete system references and maps

**Files:**
- `COMPLETE-SYSTEM-REFERENCE.md` - Complete system documentation
- `FILE-ORGANIZATION.md` - Previous organization summary
- `DOCUMENTATION-MAP.md` - This file

**Use When:** Need comprehensive system overview

---

### `/docs/cleanup/` - Cleanup & Maintenance
**Purpose:** Codebase cleanup reports

**Files:**
- `CLEANUP-SUMMARY.md` - Previous cleanup notes
- `CODEBASE-CLEANUP-REPORT.md` - Comprehensive cleanup report

**Use When:** Understanding codebase maintenance history

---

### `/docs/verification/` - Data Verification
**Purpose:** Data verification and testing documentation

**Files:**
- `REAL-DATA-CONFIRMATION.md` - Confirms all features use real data (not simulated)

**Use When:** Verifying data integrity and feature behavior

---

### `/docs/guides/` - User & Developer Guides
**Purpose:** Step-by-step guides and tutorials

**Use When:** Learning how to use specific features

---

### `/docs/project-summaries/` - Project Status
**Purpose:** Historical project status reports

**Use When:** Understanding project history and milestones

---

### `/docs/completion-reports/` - Task Reports
**Purpose:** Completion reports for development tasks

**Use When:** Tracking completed work and implementation details

---

### `/docs/audits/` - Code Audits
**Purpose:** Code quality and security audits

**Files:**
- `2025-10-25-COMPREHENSIVE-AUDIT.md` - Latest comprehensive audit

**Use When:** Reviewing code quality and security

---

### `/docs/sessions/` - Session Notes
**Purpose:** Development session notes and decisions

**Use When:** Understanding development decisions and context

---

### `/docs/monitoring/` - Monitoring & Observability
**Purpose:** Monitoring setup and documentation

**Use When:** Setting up monitoring, debugging production issues

---

### `/docs/archive/` - Historical Documentation
**Purpose:** Old documentation (may be outdated)

**Contains:** 100+ archived documents from previous development phases

**⚠️ Warning:** These files may be outdated. Always check current documentation first.

**Use When:** Understanding historical context only

---

## 🔍 Quick Find Guide

### I want to...

**Set up the project:**
→ `/docs/setup/API-SETUP-QUICKSTART.md`

**Understand the architecture:**
→ `/docs/developer/ARCHITECTURE.md`
→ `/docs/developer/TECHNICAL-ARCHITECTURE.md`

**Set up linting/formatting:**
→ `/docs/developer/CODE_QUALITY.md`

**Work with the pricing engine:**
→ `/docs/developer/PRICING-ENGINE-QUICKSTART.md`
→ `/docs/developer/PRICING_ENGINE_SETUP.md`

**Understand data enrichment:**
→ `/docs/developer/ENRICHMENT.md`

**Work with the database:**
→ `/docs/developer/SUPABASE_SECURITY.md`
→ `/docs/developer/ARCHITECTURE.md` (database section)

**Understand the queue system:**
→ `/docs/developer/QUEUE_SYSTEM.md`

**Get a complete system overview:**
→ `/docs/references/COMPLETE-SYSTEM-REFERENCE.md`

**Verify data is real (not simulated):**
→ `/docs/verification/REAL-DATA-CONFIRMATION.md`

**Understand cleanup history:**
→ `/docs/cleanup/CODEBASE-CLEANUP-REPORT.md`

---

## 📊 Organization Stats

**Total MD Files Organized:** 10+ files moved
**Folders Created:** 5 new folders
- `/docs/setup/`
- `/docs/components/`
- `/docs/references/`
- `/docs/cleanup/`
- `/docs/verification/`

**Root Directory Cleaned:** From 9+ files → 4 essential files

**Documentation Categories:** 14 categories total

---

## ✅ Organization Benefits

1. **Clean Root Directory**
   - Only 4 essential files remain
   - Follows standard conventions

2. **Logical Grouping**
   - Docs organized by purpose
   - Easy to find what you need

3. **Clear Navigation**
   - Predictable folder structure
   - Consistent naming

4. **Better Discoverability**
   - New developers know where to look
   - Related docs together

5. **Maintainability**
   - Easy to update related docs
   - Clear ownership by category

---

## 🔄 Maintenance

### Adding New Documentation

**Setup guides:** → `/docs/setup/`
**Technical docs:** → `/docs/developer/`
**Component docs:** → `/docs/components/`
**Reference docs:** → `/docs/references/`
**Status reports:** → `/docs/project-summaries/`
**Cleanup reports:** → `/docs/cleanup/`

### Archiving Old Docs

Move to `/docs/archive/` when:
- Documentation is superseded by newer versions
- Feature has been removed
- Information is historical only

**Always add date prefix:** `YYYY-MM-DD-filename.md`

---

## 📝 Last Updated

**Date:** 2025-10-25
**By:** Claude Code
**Changes:** Complete reorganization of all markdown files
