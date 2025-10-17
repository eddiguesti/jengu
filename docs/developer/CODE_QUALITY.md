# Code Quality Tools

**Last Updated**: 2025-10-17

This document describes the code quality tooling for the Jengu monorepo, including TypeScript, ESLint, and Prettier configuration.

## Table of Contents

1. [Overview](#overview)
2. [TypeScript Configuration](#typescript-configuration)
3. [ESLint Configuration](#eslint-configuration)
4. [Prettier Configuration](#prettier-configuration)
5. [Running Checks](#running-checks)
6. [VS Code Integration](#vs-code-integration)
7. [Troubleshooting](#troubleshooting)
8. [Pre-commit Workflow](#pre-commit-workflow)

---

## Overview

### Tools in Use

- **TypeScript 5+**: Static type checking with strict mode
- **ESLint 9**: Linting with flat config (TypeScript, React, Tailwind)
- **Prettier**: Code formatting with Tailwind class sorting
- **tsx**: TypeScript execution with auto-restart (backend)
- **Vite**: TypeScript compilation with HMR (frontend)

### Architecture

All code quality tools are configured at the **monorepo root level**:

```
jengu/
├── eslint.config.js          # ESLint 9 flat config
├── prettier.config.js        # Prettier configuration
├── .prettierignore           # Files to exclude from formatting
├── tsconfig.base.json        # Shared TypeScript base config
├── package.json              # Root scripts for quality checks
├── backend/
│   └── tsconfig.json         # Extends tsconfig.base.json
└── frontend/
    └── tsconfig.json         # Extends tsconfig.base.json
```

**Key Principle**: Most quality checks should be run from the **project root**, not individual workspaces.

---

## TypeScript Configuration

### Shared Base Configuration

**File**: `tsconfig.base.json` (project root)

Contains settings that are common across both frontend and backend:

```json
{
  "compilerOptions": {
    // Strict type checking
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    // TODO: Re-enable after fixing undefined checks
    // "noUncheckedIndexedAccess": true,

    // Module resolution
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,

    // Other options
    "skipLibCheck": true,
    "isolatedModules": true
  }
}
```

### Backend Configuration

**File**: `backend/tsconfig.json`

Extends the base config with Node.js-specific settings:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": ".",
    "sourceMap": true,
    "allowJs": true,
    "checkJs": false
  },
  "include": ["**/*.ts", "**/*.js"],
  "exclude": ["node_modules", "dist"]
}
```

**Key Features**:

- `module: "NodeNext"` - Native Node.js ESM support
- `target: "ES2022"` - Modern JavaScript features
- Compiles to `dist/` directory
- Source maps for debugging

### Frontend Configuration

**File**: `frontend/tsconfig.json`

Extends the base config with React/browser-specific settings:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Key Features**:

- `jsx: "react-jsx"` - Modern JSX transform (no React import needed)
- `moduleResolution: "bundler"` - Vite-optimized resolution
- `noEmit: true` - Vite handles compilation
- Path aliases (`@/*` → `src/*`)

### Type Checking Commands

```bash
# From project root (recommended)
pnpm run type-check              # Check both workspaces
pnpm run type-check:frontend     # Frontend only
pnpm run type-check:backend      # Backend only

# From individual workspaces
cd frontend && pnpm run type-check
cd backend && pnpm run type-check
```

---

## ESLint Configuration

### Flat Config (ESLint 9)

**File**: `eslint.config.js` (project root)

Uses the new flat config format (replaces `.eslintrc`).

**Structure**:

```javascript
export default tseslint.config(
  // 1. Global ignores
  { ignores: ['**/node_modules/**', '**/dist/**', ...] },

  // 2. Base JavaScript rules
  js.configs.recommended,

  // 3. TypeScript rules (all .ts/.tsx files)
  ...tseslint.configs.recommendedTypeChecked,

  // 4. Frontend-specific (React + Tailwind)
  { files: ['frontend/**/*.{ts,tsx}'], ... },

  // 5. Backend-specific (Node.js)
  { files: ['backend/**/*.ts'], ... },

  // 6. Prettier (must be last)
  prettier
)
```

### Key Features

**TypeScript Integration**:

- Uses `projectService: true` (auto-discovers tsconfig files)
- Type-aware linting (catches type errors ESLint can detect)
- Works across monorepo workspaces

**Frontend-Specific Rules** (`frontend/**/*.{ts,tsx}`):

- React hooks validation
- React JSX best practices
- Tailwind CSS class validation
- Custom Tailwind theme colors whitelisted

**Backend-Specific Rules** (`backend/**/*.ts`):

- Unused variable warnings (except prefixed with `_`)
- Node.js-specific patterns

**Prettier Integration**:

- `eslint-config-prettier` disables ESLint formatting rules
- Prevents conflicts between ESLint and Prettier

### Linting Commands

```bash
# From project root (recommended)
pnpm run lint                    # Check all files
pnpm run lint:fix                # Auto-fix issues

# No workspace-specific lint commands
# Always run from root to ensure consistent config
```

### Common ESLint Rules

**TypeScript**:

- `@typescript-eslint/no-explicit-any` - Warn against `any` types
- `@typescript-eslint/no-unused-vars` - Warn on unused variables
- `@typescript-eslint/no-misused-promises` - Catch async mistakes

**React** (frontend only):

- `react-hooks/rules-of-hooks` - Enforce hooks rules
- `react-hooks/exhaustive-deps` - Validate useEffect dependencies
- `react/prop-types` - Disabled (using TypeScript)

**Tailwind** (frontend only):

- `tailwindcss/classnames-order` - Enforce class order (warn)
- `tailwindcss/no-custom-classname` - Validate Tailwind classes (with whitelist)
- `tailwindcss/no-contradicting-classname` - Catch conflicting classes (error)

---

## Prettier Configuration

### Configuration

**File**: `prettier.config.js` (project root)

```javascript
export default {
  semi: false, // No semicolons
  singleQuote: true, // Single quotes
  tabWidth: 2, // 2 space indentation
  trailingComma: 'es5', // Trailing commas where valid in ES5
  printWidth: 100, // 100 character line length
  arrowParens: 'avoid', // Omit parens when possible
  plugins: ['prettier-plugin-tailwindcss'], // Auto-sort Tailwind classes
}
```

### Prettier Ignore

**File**: `.prettierignore` (project root)

```
# Dependencies
node_modules

# Build outputs
dist
build
.next
out

# Generated files
coverage
*.min.js
*.min.css
pnpm-lock.yaml

# Config files with special formatting
.vscode
```

### Formatting Commands

```bash
# From project root (recommended)
pnpm run format                  # Format all files
pnpm run format:check            # Check formatting (CI-friendly)

# No workspace-specific format commands
# Always run from root to ensure consistent formatting
```

### Tailwind Class Sorting

The `prettier-plugin-tailwindcss` plugin automatically sorts Tailwind classes in the recommended order:

**Before**:

```tsx
<div className="mt-4 text-primary flex p-2">
```

**After**:

```tsx
<div className="flex p-2 mt-4 text-primary">
```

This only affects files with Tailwind classes (primarily frontend).

---

## Running Checks

### Recommended Workflow

**From project root** - Run all checks together:

```bash
# Best practice: Run before every commit
pnpm run check-all               # Type check + lint + format check

# Auto-fix everything
pnpm run fix-all                 # Lint fix + format
```

### Individual Checks

**From project root**:

```bash
pnpm run type-check              # TypeScript (both workspaces)
pnpm run lint                    # ESLint (all files)
pnpm run format:check            # Prettier (all files)
```

**From project root** (workspace-specific):

```bash
pnpm run type-check:frontend     # Frontend TypeScript only
pnpm run type-check:backend      # Backend TypeScript only
```

### Build Commands

**Frontend** (must be run from `frontend/` directory):

```bash
cd frontend
pnpm run build:check             # Type check + Vite build
pnpm run build                   # Vite build only (skip type check)
pnpm run preview                 # Preview production build
```

**Backend** (must be run from `backend/` directory):

```bash
cd backend
pnpm run build                   # Compile TypeScript to dist/
pnpm run start                   # Run compiled JavaScript
```

### Command Reference Table

| Command                 | Location      | Purpose                                  |
| ----------------------- | ------------- | ---------------------------------------- |
| `pnpm run check-all`    | **Root**      | Type + lint + format check (CI-friendly) |
| `pnpm run fix-all`      | **Root**      | Auto-fix lint + format                   |
| `pnpm run type-check`   | **Root**      | TypeScript check (both workspaces)       |
| `pnpm run lint`         | **Root**      | ESLint check (all files)                 |
| `pnpm run lint:fix`     | **Root**      | ESLint auto-fix                          |
| `pnpm run format`       | **Root**      | Format all files                         |
| `pnpm run format:check` | **Root**      | Check formatting (no changes)            |
| `pnpm run build:check`  | **frontend/** | Type check + build                       |
| `pnpm run build`        | **frontend/** | Build only                               |
| `pnpm run build`        | **backend/**  | Compile TypeScript                       |

---

## VS Code Integration

### Settings

**File**: `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.useFlatConfig": true,
  "eslint.workingDirectories": ["./frontend", "./backend"]
}
```

**Features**:

- Auto-format on save (Prettier)
- Auto-fix ESLint issues on save
- ESLint flat config support
- Workspace-aware ESLint

### Recommended Extensions

**File**: `.vscode/extensions.json`

```json
{
  "recommendations": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"]
}
```

Install these extensions for the best development experience.

### .gitignore Configuration

Only `settings.json` and `extensions.json` are tracked in git. Personal VS Code files remain private:

```gitignore
# VS Code - allow shared settings and extension recommendations
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
```

---

## Troubleshooting

### TypeScript Issues

**Error: "Cannot find module" or "Module not found"**

Solution:

```bash
# Clean and reinstall dependencies
pnpm install

# Check tsconfig.json paths
# Frontend: Ensure "@/*" maps to "./src/*"
# Backend: Ensure imports use .js extension (ESM convention)
```

**Error: "noUncheckedIndexedAccess" errors**

This setting is currently disabled in `tsconfig.base.json`. Re-enable after fixing undefined array access checks:

```json
// tsconfig.base.json
"noUncheckedIndexedAccess": true
```

### ESLint Issues

**Error: ESLint reports "any" type warnings**

This is expected! Backend has ~1100 instances that need gradual fixing. To suppress temporarily:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = ...
```

**Error: Tailwind custom classnames warnings**

Custom theme colors are whitelisted in `eslint.config.js`. If you add new custom classes, update the whitelist:

```javascript
'tailwindcss/no-custom-classname': [
  'warn',
  {
    whitelist: [
      'primary.*',
      'your-new-color.*',  // Add here
    ],
  },
]
```

**Error: React hooks warnings**

Follow the React hooks rules:

- Only call hooks at top level
- Only call hooks from React functions
- List all dependencies in useEffect

### Prettier Issues

**Tailwind classes not sorting**

Ensure `prettier-plugin-tailwindcss` is installed:

```bash
pnpm install -w -D prettier-plugin-tailwindcss
```

**Files not formatting**

Check `.prettierignore` - file might be excluded.

### Build Issues

**Backend build fails**

```bash
cd backend
rm -rf dist                      # Clean build output
pnpm run build                   # Rebuild
```

**Frontend build fails**

```bash
cd frontend
rm -rf node_modules .vite dist   # Clean all caches
pnpm install                     # Reinstall
pnpm run build:check             # Rebuild with type check
```

---

## Pre-commit Workflow

### Recommended Steps

**Before every commit**:

```bash
# 1. From project root - auto-fix everything
pnpm run fix-all

# 2. Check that everything passes
pnpm run check-all

# 3. If checks pass, commit
git add .
git commit -m "your message"
```

### Git Hooks (Optional - Not Currently Configured)

Consider adding `husky` + `lint-staged` for automatic pre-commit checks:

```bash
# Install (if desired)
pnpm add -D -w husky lint-staged

# Configure in package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

This would automatically lint and format staged files before each commit.

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install

      - name: Run quality checks
        run: pnpm run check-all

      - name: Build frontend
        run: cd frontend && pnpm run build:check

      - name: Build backend
        run: cd backend && pnpm run build
```

---

## Summary

### Key Takeaways

1. **Run checks from root**: Use `pnpm run check-all` before committing
2. **TypeScript strict mode**: Both workspaces use strict type checking
3. **ESLint flat config**: Modern ESLint 9 configuration
4. **Prettier handles formatting**: Never format manually
5. **VS Code integration**: Format and fix on save

### Quick Commands

```bash
# From project root (most common)
pnpm run check-all               # Before every commit
pnpm run fix-all                 # Auto-fix issues

# Individual checks (from root)
pnpm run type-check              # TypeScript
pnpm run lint                    # ESLint
pnpm run format:check            # Prettier

# Workspace-specific (from workspace directory)
cd frontend && pnpm run build:check
cd backend && pnpm run build
```

### Next Steps

- Consider adding automated tests (Jest, Vitest)
- Consider adding pre-commit hooks (husky + lint-staged)
- Incrementally fix TypeScript `any` types in backend
- Re-enable `noUncheckedIndexedAccess` after fixing array access

---

**For detailed architecture information, see `ARCHITECTURE.md` in this directory.**
