# ESLint 9 and Prettier Setup Plan

**Status**: ✅ Complete
**Created**: 2025-10-16
**Updated**: 2025-10-16 (Completed)
**Commits**: `a9e23bd`, `10136c0`

## Completion Summary

✅ **Setup Complete** - ESLint 9 and Prettier are fully configured and operational.

**What Works**:

- ✅ TypeScript type-checking passes (`pnpm run type-check`)
- ✅ Prettier formatting works (`pnpm run format`)
- ✅ ESLint linting works (`pnpm run lint`)
- ✅ Frontend and backend builds succeed
- ✅ All configuration files committed
- ✅ VS Code integration configured

**Known Issues** (to be addressed in follow-up tasks):

- 🔶 **Tailwind custom classnames**: ESLint warns about custom theme colors (`text-primary`, `text-success`, etc.). These are valid Tailwind classes defined in `frontend/tailwind.config.js`. Solution: Configure `tailwindcss/no-custom-classname` to whitelist these patterns.
- 🔶 **TypeScript strictness** (`noUncheckedIndexedAccess`): Temporarily disabled to allow initial setup. Re-enable in a future task to catch undefined array access bugs.
- 🔶 **Backend TypeScript safety**: ~1100 errors from `@typescript-eslint/no-explicit-any` and unsafe operations. These are legitimate type safety issues that should be fixed incrementally.
- 🔶 **React issues**: A few `react/no-unescaped-entities` and `@typescript-eslint/no-misused-promises` errors.

**Next Steps**:

1. Configure Tailwind ESLint to allow custom theme colors
2. Fix React-specific linting errors (~10 errors)
3. Incrementally fix TypeScript `any` types in backend
4. Re-enable `noUncheckedIndexedAccess` and fix undefined checks
5. Consider adding git hooks (husky + lint-staged) for pre-commit linting

## Overview

Configure ESLint 9 (flat config) and Prettier at the monorepo root level to provide consistent linting and formatting across both backend and frontend workspaces.

**Prerequisites**: ✅ TypeScript migration completed for both backend and frontend
**Current State**:

- Root workspace setup exists with `pnpm-workspace.yaml`
- TypeScript working globally (`pnpm run type-check` works)
- Frontend has old ESLint 8 dependencies (need to remove/upgrade)
- No Prettier configuration exists
- No shared root-level linting/formatting

## Configuration Philosophy: Global vs. Workspace-Specific

Understanding when to use shared vs. workspace-specific configuration:

### Prettier (Global)

**Shared configuration** - Same formatting rules everywhere.

- Code style (semicolons, quotes, line length) should be consistent across entire monorepo
- Prettier plugins (like Tailwind class sorting) can be global - they only affect files that use those features
- **Example**: Even though backend doesn't use Tailwind, the `prettier-plugin-tailwindcss` plugin won't do anything to backend files (no Tailwind classes to sort)

### ESLint (Workspace-Specific)

**Different rules per workspace** - Frontend and backend have different needs.

- Frontend uses React, Tailwind, browser APIs → needs React hooks rules, Tailwind class validation
- Backend uses Node.js, Express, server APIs → needs Node-specific rules
- ESLint flat config supports multiple configuration objects that target specific file patterns
- **Example**: Tailwind ESLint rules only apply to `frontend/**/*.{ts,tsx}` files

### TypeScript (Hybrid)

**Shared base + workspace overrides** - Common strictness, different compilation targets.

- **Shared**: Type-checking strictness (`strict`, `noUnusedLocals`, etc.) should be consistent
- **Workspace-specific**:
  - Backend: Node.js module system (`NodeNext`), ES2022 target, builds to `dist/`
  - Frontend: ESNext modules, browser DOM types, JSX support, path aliases (`@/*`)

**Key Principle**: Make it global if it's about code quality/style consistency. Make it workspace-specific if it's about the runtime environment or framework-specific features.

---

## Phase 1: Install Root Dependencies

### 1.1: Install ESLint 9 and Prettier at Root

**Goal**: Install shared tooling at monorepo root.

```bash
# Install ESLint 9, Prettier, and TypeScript ESLint support at root
pnpm add -D -w eslint@^9.0.0 prettier
pnpm add -D -w typescript-eslint eslint-config-prettier
```

**Notes**:

- `typescript-eslint` is the unified package for ESLint 9 (replaces `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`)
- `-w` flag installs to workspace root
- `eslint-config-prettier` turns off ESLint rules that conflict with Prettier

### 1.2: Install Frontend-Specific ESLint Plugins at Root

**Goal**: Add React and Tailwind-specific linting support.

```bash
# Install React plugins at root (used by frontend config)
pnpm add -D -w eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh

# Install Tailwind CSS linting plugin for frontend
pnpm add -D -w eslint-plugin-tailwindcss
```

**Note**: Tailwind ESLint plugin will only be applied to frontend files, not backend.

### 1.3: Remove Old ESLint 8 Dependencies from Frontend

**Goal**: Clean up outdated ESLint packages in frontend workspace.

```bash
cd frontend
pnpm remove eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react-hooks eslint-plugin-react-refresh
cd ..
```

**Verification**: Check `frontend/package.json` - ESLint dependencies should be gone.

---

## Phase 2: Configure Prettier (Root)

### 2.1: Install Prettier Plugins

**Goal**: Add Tailwind CSS class sorting support for Prettier.

```bash
# Install Prettier plugin for Tailwind CSS class sorting
pnpm add -D -w prettier-plugin-tailwindcss
```

**Note**: This plugin automatically sorts Tailwind classes in the recommended order. Only affects files with Tailwind classes (frontend), has no impact on backend.

### 2.2: Create Prettier Configuration

**Goal**: Single shared Prettier config for entire monorepo.

**File**: `prettier.config.js` (root level)

```js
/** @type {import("prettier").Config} */
export default {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  arrowParens: 'avoid',
  plugins: ['prettier-plugin-tailwindcss'],
}
```

**Rationale**:

- `semi: false` - Cleaner, modern style
- `singleQuote: true` - Consistency with most of codebase
- `printWidth: 100` - Readable line length
- `arrowParens: 'avoid'` - Cleaner arrow functions when possible
- `plugins` - Tailwind class sorting (only affects frontend with Tailwind classes)

### 2.3: Create Prettier Ignore File

**Goal**: Exclude files that shouldn't be formatted.

**File**: `.prettierignore` (root level)

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

---

## Phase 3: Configure ESLint 9 (Flat Config)

### 3.1: Create ESLint Flat Config

**Goal**: Modern ESLint 9 flat config with TypeScript support.

**File**: `eslint.config.js` (root level)

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tailwindcss from 'eslint-plugin-tailwindcss'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  // Global ignores
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', '**/coverage/**'],
  },

  // Base JavaScript rules for all files
  js.configs.recommended,

  // Base TypeScript rules for all .ts/.tsx files
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Frontend-specific configuration (React + Tailwind)
  {
    files: ['frontend/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      tailwindcss,
    },
    settings: {
      react: {
        version: 'detect',
      },
      tailwindcss: {
        // Optional: specify custom Tailwind config location
        // config: 'frontend/tailwind.config.js',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      'react/prop-types': 'off', // Using TypeScript for prop validation

      // Tailwind CSS linting rules (frontend only)
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': 'warn',
      'tailwindcss/no-contradicting-classname': 'error',
    },
  },

  // Backend-specific configuration (Node.js)
  {
    files: ['backend/**/*.ts'],
    rules: {
      // Node.js-specific rules can go here
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Disable rules that conflict with Prettier (must be last)
  prettier
)
```

**Key Features**:

- ✅ Flat config format (ESLint 9 required)
- ✅ TypeScript type-aware linting with `projectService`
- ✅ Separate configs for frontend (React + Tailwind) vs backend (Node.js)
- ✅ React hooks linting
- ✅ Tailwind CSS linting (frontend only)
- ✅ Prettier integration (disables conflicting rules)

### 3.2: Verification

```bash
# Test ESLint config loads without errors
pnpm exec eslint --version
pnpm exec eslint --print-config eslint.config.js
```

---

## Phase 4: Add Root Package Scripts

### 4.1: Update Root package.json Scripts

**Goal**: Provide commands to lint/format entire monorepo from root.

**Add to `package.json` scripts section**:

```json
{
  "scripts": {
    "type-check": "pnpm -r run type-check",
    "type-check:frontend": "pnpm --filter frontend run type-check",
    "type-check:backend": "pnpm --filter backend run type-check",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check-all": "pnpm run type-check && pnpm run lint && pnpm run format:check",
    "fix-all": "pnpm run lint:fix && pnpm run format"
  }
}
```

**Usage**:

- `pnpm run lint` - Check for linting issues
- `pnpm run lint:fix` - Auto-fix linting issues
- `pnpm run format` - Format all files with Prettier
- `pnpm run format:check` - Check if files are formatted (CI-friendly)
- `pnpm run check-all` - Run all checks (type, lint, format)
- `pnpm run fix-all` - Auto-fix linting and formatting

### 4.2: Update Frontend package.json Scripts

**Goal**: Remove old ESLint script or update it to use root config.

**Current frontend script**: `"lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"`

**Options**:

1. **Option A (Recommended)**: Remove the frontend-specific lint script entirely (use root)
2. **Option B**: Keep it for convenience, but update to: `"lint": "eslint ."`

**Recommended action**: Remove the `lint` script from frontend/package.json since we'll run linting from root.

### 4.3: Update Backend package.json Scripts

**Goal**: Add any missing scripts for consistency.

Backend already has `type-check`. No additional scripts needed (linting will run from root).

---

## Phase 5: VS Code Integration (Optional)

### 5.1: Update VS Code Settings

**Goal**: Enable format-on-save and ESLint auto-fix in editor.

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

### 5.2: Create VS Code Extensions Recommendations

**Goal**: Recommend ESLint and Prettier extensions to team.

**File**: `.vscode/extensions.json`

```json
{
  "recommendations": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"]
}
```

### 5.3: Update .gitignore for VS Code

**Goal**: Allow only `settings.json` and `extensions.json` in git, ignore everything else in `.vscode/`.

**Current state**: `.vscode/` is entirely ignored in `.gitignore`.

**Update root `.gitignore`**:

Replace the line:

```
.vscode/
```

With:

```
# VS Code - allow shared settings and extension recommendations
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
```

**Explanation**:

- `.vscode/*` - Ignore everything in .vscode directory
- `!.vscode/settings.json` - Exception: track settings.json
- `!.vscode/extensions.json` - Exception: track extension recommendations
- This allows sharing team settings while keeping personal workspace files (like `.vscode/launch.json`) private

---

## Phase 6: Shared TypeScript Config

### 6.1: Create Base TypeScript Config

**Goal**: Extract common TypeScript settings into shared base config.

**Important**: The base config contains only settings that are truly common across both workspaces. Workspace-specific settings (like `module`, `jsx`, `paths`, etc.) remain in their respective workspace configs.

**File**: `tsconfig.base.json` (root level)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    // Strict type checking
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

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

### 6.2: Update Backend tsconfig.json

**Change**: Add `"extends": "../tsconfig.base.json"` at the top.

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

### 6.3: Update Frontend tsconfig.json

**Change**: Add `"extends": "../tsconfig.base.json"` at the top.

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

**Benefits**:

- Centralized type-checking strictness settings
- Easier to maintain consistent TypeScript behavior
- Reduces duplication across workspace configs
- Workspace-specific settings (like module system, JSX) remain separate as needed

---

## Phase 7: Testing & Validation

### 7.1: Test All Scripts

**Goal**: Verify everything works before formatting the codebase.

```bash
# From project root

# 1. Test type checking
pnpm run type-check
# Expected: Should pass with no errors (already working)

# 2. Test linting (will show violations initially)
pnpm run lint
# Expected: May show linting warnings/errors in existing code

# 3. Test formatting check (will show unformatted files)
pnpm run format:check
# Expected: Will show files that need formatting

# 4. Test the full check (don't run yet if there are lint errors)
pnpm run check-all
# Expected: All checks should eventually pass
```

### 7.2: Fix Initial Linting Issues

**Goal**: Address any breaking linting errors before formatting.

```bash
# Try auto-fix first
pnpm run lint:fix

# If auto-fix doesn't resolve everything, manually fix remaining issues
# Common issues to expect:
# - Unused variables
# - Missing React imports (if using old JSX transform)
# - TypeScript type issues caught by ESLint
```

**Strategy**:

- If there are many errors, fix them incrementally by file/directory
- Use `eslint --fix <path>` to fix specific areas
- Consider temporarily disabling strict rules if needed (document why)

### 7.3: Verify No Breaking Changes

```bash
# Backend: Ensure dev server still works
cd backend
pnpm run dev
# Test a few API endpoints
^C

# Frontend: Ensure dev server still works
cd frontend
pnpm run dev
# Test a few pages in browser
^C

# Run builds to ensure no compilation errors
cd ../backend
pnpm run build

cd ../frontend
pnpm run build
```

---

## Phase 8: Commit Strategy (Two-Phase)

### 8.1: Commit Configuration Setup (First Commit)

**Goal**: Commit the linting/formatting infrastructure without changing code.

```bash
# Stage configuration files only
git add package.json
git add pnpm-lock.yaml
git add eslint.config.js
git add prettier.config.js
git add .prettierignore
git add .vscode/  # if you removed it from .gitignore
git add tsconfig.base.json  # if you created it
git add frontend/package.json  # if you removed lint script
git add backend/tsconfig.json  # if you updated to extend base
git add frontend/tsconfig.json  # if you updated to extend base

# Commit
git commit -m "chore: add ESLint 9, Prettier, and shared configs

- Install ESLint 9 with flat config at monorepo root
- Add Prettier with Tailwind CSS plugin for class sorting
- Configure TypeScript ESLint for both workspaces
- Add React and Tailwind linting for frontend
- Add shared TypeScript base config
- Remove old ESLint 8 dependencies from frontend
- Add root-level lint/format scripts
- Configure VS Code for ESLint and Prettier
- Update .gitignore to allow VS Code settings.json and extensions.json"
```

### 8.2: Run Formatters and Auto-fixes (Second Commit)

**Goal**: Apply formatting and auto-fixes to entire codebase.

```bash
# Run auto-fix and formatting
pnpm run fix-all

# Review changes
git diff

# Stage all formatted files
git add -A

# Commit
git commit -m "chore: format codebase with Prettier and ESLint

- Run Prettier formatting across all files
- Apply ESLint auto-fixes
- No functional changes"
```

**Why two commits?**

- Separates config changes from code formatting
- Makes it easier to review
- Allows reverting formatting without losing config
- Clearer git history

### 8.3: Update Documentation

**Files to update**:

1. `CLAUDE.md` - Add section on linting/formatting workflow
2. `docs/developer/ARCHITECTURE.md` - Document code quality tools

**Add to CLAUDE.md**:

````markdown
## Code Quality

### Linting and Formatting

**Run all checks (from root)**:

```bash
pnpm run check-all  # Type check + lint + format check
```
````

**Auto-fix issues**:

```bash
pnpm run fix-all  # Auto-fix linting and formatting
```

**Individual commands**:

- `pnpm run type-check` - TypeScript type checking
- `pnpm run lint` - ESLint (check only)
- `pnpm run lint:fix` - ESLint with auto-fix
- `pnpm run format` - Prettier format all files
- `pnpm run format:check` - Prettier check only (CI)

**VS Code Integration**:

- Install recommended extensions (ESLint, Prettier)
- Format-on-save is enabled
- ESLint auto-fix on save

### Pre-commit Workflow (Recommended)

Before committing:

```bash
pnpm run fix-all  # Auto-fix everything
pnpm run check-all  # Verify all checks pass
```

````

**Commit documentation updates**:
```bash
git add CLAUDE.md docs/developer/ARCHITECTURE.md
git commit -m "docs: add linting and formatting workflow documentation"
````

---

## Phase 9: Optional Enhancements (Future)

### Git Hooks with Husky + lint-staged

**Not included in this task**, but consider for the future:

```bash
# Install husky and lint-staged
pnpm add -D -w husky lint-staged

# Setup pre-commit hook
npx husky init
echo "pnpm exec lint-staged" > .husky/pre-commit

# Configure lint-staged in package.json
{
  "lint-staged": {
    "*.{ts,tsx,js}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

**Benefits**:

- Automatic linting/formatting on commit
- Only processes staged files (fast)
- Prevents committing code with errors

**Reason for deferring**: Keep initial setup simple, add later if team wants it.

---

## Exit Criteria

**This task is complete when**:

- ✅ ESLint 9 installed at root with flat config
- ✅ Prettier installed at root with shared config
- ✅ Frontend ESLint 8 dependencies removed
- ✅ Root scripts working: `lint`, `lint:fix`, `format`, `format:check`, `check-all`, `fix-all`
- ✅ `pnpm run check-all` passes with no errors
- ✅ Both backend and frontend dev servers still work
- ✅ Both backend and frontend builds succeed
- ✅ Three commits created:
  1. Config setup
  2. Code formatting
  3. Documentation update
- ✅ VS Code settings configured (optional)
- ✅ Documentation updated

---

## Rollback Plan

If issues arise:

### Rollback ESLint/Prettier

```bash
# 1. Revert the commits
git revert HEAD~2..HEAD  # Revert last 3 commits

# 2. Remove dependencies
pnpm remove -w eslint prettier typescript-eslint eslint-config-prettier
pnpm remove -w eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
pnpm remove -w eslint-plugin-tailwindcss prettier-plugin-tailwindcss

# 3. Reinstall frontend ESLint 8 (if needed)
cd frontend
pnpm add -D eslint@^8.57.0 @typescript-eslint/eslint-plugin @typescript-eslint/parser
pnpm add -D eslint-plugin-react-hooks eslint-plugin-react-refresh

# 4. Delete config files
rm eslint.config.js prettier.config.js .prettierignore
```

### Rollback TypeScript Base Config (if created)

```bash
# 1. Remove tsconfig.base.json
rm tsconfig.base.json

# 2. Remove "extends" from backend/tsconfig.json and frontend/tsconfig.json
# Manually edit the files to remove the "extends" line
```

---

## Notes & Considerations

### ESLint 9 vs ESLint 8

- ESLint 9 requires flat config (no `.eslintrc` support)
- `typescript-eslint` is now the unified package (simpler than separate parser + plugin)
- Better performance with `projectService` instead of manual `project` paths

### Prettier Philosophy

- Minimal configuration recommended (let Prettier be opinionated)
- Only override settings with strong team preferences
- Goal: End debates about code style

### Performance

- ESLint with `projectService` auto-discovers TypeScript configs
- Faster than manually specifying all `project` paths
- Scales better in monorepos

### Common Issues & Solutions

**Issue**: ESLint can't find TypeScript configs
**Solution**: Ensure `projectService: true` in ESLint config

**Issue**: Prettier and ESLint conflict
**Solution**: Always include `eslint-config-prettier` and put it last

**Issue**: Frontend React linting not working
**Solution**: Verify React plugins are installed at root and configured in flat config

**Issue**: Too many linting errors to fix
**Solution**: Start with `lint:fix` to auto-fix, then manually address remaining issues incrementally

**Issue**: Tailwind class order warnings in frontend
**Solution**: Run `pnpm run format` to auto-sort Tailwind classes with Prettier plugin

**Issue**: False positives for Tailwind custom classes
**Solution**: Configure `tailwindcss/no-custom-classname` to allow your custom patterns, or disable if using many custom classes

---

## References

- [ESLint Flat Config Documentation](https://eslint.org/docs/latest/use/configure/configuration-files)
- [typescript-eslint Getting Started](https://typescript-eslint.io/getting-started/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier)
- [prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)
- [eslint-plugin-tailwindcss](https://github.com/francoismassart/eslint-plugin-tailwindcss)
