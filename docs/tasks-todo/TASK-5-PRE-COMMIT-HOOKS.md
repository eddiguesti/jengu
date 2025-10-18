# Task 5: Add Pre-commit Hooks for Code Quality

**Priority**: LOW-MEDIUM
**Status**: NOT STARTED
**Effort**: 30 minutes
**Blocker**: None (independent task)
**Assigned**: Future sprint

---

## 🎯 Objective

Prevent code quality issues by automatically running linting and formatting checks before commits.

---

## 📋 Implementation Steps

### Step 1: Install Dependencies

```bash
pnpm add -D husky lint-staged
```

### Step 2: Initialize Husky

```bash
npx husky init
```

### Step 3: Configure lint-staged

**File**: `package.json`

Add:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Step 4: Create Pre-commit Hook

**File**: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm lint-staged
```

### Step 5: Test

```bash
# Make a change and commit
git add .
git commit -m "test: pre-commit hook"
# Should auto-format and lint before committing
```

---

## ✅ Acceptance Criteria

- [ ] Pre-commit hook installed
- [ ] Auto-formats code on commit
- [ ] Auto-fixes linting issues
- [ ] Blocks commit if unfixable errors

---

**Reference**: `docs/COMPREHENSIVE-AUDIT-2025-01-18.md` (High Priority #1)
**Next Task**: Task 6 (Zod validation)
