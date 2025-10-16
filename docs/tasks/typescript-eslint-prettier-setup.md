# TypeScript, ESLint, and Prettier Setup Plan

**Status**: Planned (not started)
**Created**: 2025-10-16

## Overview

Modernize the Jengu monorepo with TypeScript, ESLint 9, and Prettier using shared root-level configuration.

---

## Phase 1: Backend TypeScript Migration

### Phase 1.1: Setup TypeScript Infrastructure

**Goal**: Add TypeScript tooling to backend without converting any code yet.

- [ ] Install TypeScript and type definitions in backend
  ```bash
  cd backend
  pnpm add -D typescript @types/node @types/express @types/cors @types/multer
  ```
- [ ] Create `backend/tsconfig.json` with Node.js-appropriate settings
  - Target: ES2022 (for Node 20+)
  - Module: Node16 or NodeNext (proper ESM support)
  - Output: `dist/` directory
  - Include source maps for debugging
- [ ] Update `backend/package.json` scripts:
  - `build`: Compile TypeScript to JavaScript
  - `dev`: Use `tsx` or `ts-node` for development (with watch mode)
  - `start`: Run compiled JavaScript from `dist/`
- [ ] Add `backend/.gitignore` entries for `dist/` and `*.tsbuildinfo`

### Phase 1.2: Convert Core Files to TypeScript

**Goal**: Convert main server file and critical services.

- [ ] Rename `server.js` → `server.ts`
- [ ] Add type definitions for:
  - Express Request/Response with custom properties (`req.userId`)
  - Supabase client types
  - Environment variables (create `types/env.d.ts`)
- [ ] Convert service files to TypeScript:
  - [ ] `services/mlAnalytics.js` → `.ts`
  - [ ] `services/marketSentiment.js` → `.ts`
  - [ ] `services/dataTransform.js` → `.ts`
  - [ ] `services/enrichmentService.js` → `.ts`
- [ ] Create shared types in `backend/src/types/`:
  - [ ] `database.ts` - Database table schemas
  - [ ] `api.ts` - API request/response types
  - [ ] `weather.ts` - Weather API types
- [ ] Fix all type errors (aim for strict mode compliance)

### Phase 1.3: Update Build & Deployment

**Goal**: Ensure backend builds and runs correctly as TypeScript.

- [ ] Test development workflow:
  - [ ] `pnpm run dev` works with watch mode
  - [ ] Hot reload works properly
  - [ ] All API endpoints functional
- [ ] Test production build:
  - [ ] `pnpm run build` compiles successfully
  - [ ] `pnpm start` runs compiled code
  - [ ] No runtime errors
- [ ] Update any deployment documentation/scripts
- [ ] Update `ARCHITECTURE.md` with TypeScript patterns

**Phase 1 Exit Criteria**:
- ✅ Backend fully TypeScript with no `any` types (or explicit `any` where needed)
- ✅ All tests passing (if any exist)
- ✅ Dev and prod builds working
- ✅ Documentation updated

---

## Phase 2: Modern Tooling Setup (ESLint 9 + Prettier)

### Phase 2.1: Install Root Dependencies

**Goal**: Set up shared tooling at monorepo root.

- [ ] Create root `package.json` with workspace config
  ```bash
  pnpm init
  # Configure name: "jengu-monorepo", private: true
  ```
- [ ] Install shared dev dependencies at root:
  ```bash
  pnpm add -D -w prettier eslint@^9.0.0 typescript
  pnpm add -D -w @typescript-eslint/parser @typescript-eslint/eslint-plugin
  pnpm add -D -w eslint-config-prettier eslint-plugin-prettier
  ```
- [ ] Frontend-specific ESLint plugins (install at root):
  ```bash
  pnpm add -D -w eslint-plugin-react eslint-plugin-react-hooks @eslint-react/eslint-plugin
  ```

### Phase 2.2: Configure Prettier (Root)

**Goal**: Single shared Prettier config for entire monorepo.

- [ ] Create `prettier.config.js` (or `.prettierrc.json`) at root:
  ```js
  export default {
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'es5',
    printWidth: 100,
    arrowParens: 'avoid',
  }
  ```
- [ ] Create `.prettierignore` at root:
  ```
  node_modules
  dist
  build
  coverage
  .next
  *.min.js
  pnpm-lock.yaml
  ```

### Phase 2.3: Configure ESLint 9 (Flat Config)

**Goal**: Modern ESLint 9 flat config with TypeScript support.

- [ ] Create `eslint.config.js` at root (ESLint 9 flat config format)
  - Base config for all JavaScript/TypeScript files
  - TypeScript parser and plugin setup
  - Prettier integration (turns off conflicting rules)
  - Separate config objects for frontend vs backend
  - React-specific rules for frontend
  - Node-specific rules for backend
- [ ] Key config sections:
  ```js
  export default [
    // Global ignores
    { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**'] },

    // Base TypeScript config (both projects)
    {
      files: ['**/*.{js,ts,tsx}'],
      languageOptions: {
        parser: tsParser,
        parserOptions: { project: true }
      },
      plugins: { '@typescript-eslint': tsPlugin },
      rules: { /* shared rules */ }
    },

    // Frontend-specific (React)
    {
      files: ['frontend/**/*.{ts,tsx}'],
      plugins: { react, 'react-hooks': reactHooks },
      settings: { react: { version: 'detect' } },
      rules: { /* React rules */ }
    },

    // Backend-specific (Node)
    {
      files: ['backend/**/*.ts'],
      rules: { /* Node rules */ }
    },
  ]
  ```

### Phase 2.4: Configure TypeScript at Root

**Goal**: Shared base TypeScript config with project-specific extensions.

- [ ] Create `tsconfig.base.json` at root:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true
    }
  }
  ```
- [ ] Update `frontend/tsconfig.json` to extend base:
  ```json
  {
    "extends": "../tsconfig.base.json",
    "compilerOptions": {
      "target": "ES2020",
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "jsx": "react-jsx",
      "moduleResolution": "bundler",
      "noEmit": true
    }
  }
  ```
- [ ] Update `backend/tsconfig.json` to extend base:
  ```json
  {
    "extends": "../tsconfig.base.json",
    "compilerOptions": {
      "target": "ES2022",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "outDir": "./dist",
      "rootDir": "./src"
    }
  }
  ```

### Phase 2.5: Add Root Package Scripts

**Goal**: Single commands to check/format entire monorepo.

- [ ] Add scripts to root `package.json`:
  ```json
  {
    "scripts": {
      "lint": "eslint .",
      "lint:fix": "eslint . --fix",
      "format": "prettier --write .",
      "format:check": "prettier --check .",
      "type-check": "pnpm -r run type-check",
      "check-all": "pnpm run type-check && pnpm run lint && pnpm run format:check",
      "fix-all": "pnpm run lint:fix && pnpm run format"
    }
  }
  ```
- [ ] Add `type-check` script to frontend and backend package.json:
  - Frontend: `"type-check": "tsc --noEmit"`
  - Backend: `"type-check": "tsc --noEmit"`

### Phase 2.6: VS Code Integration (Optional)

**Goal**: Editor integration for seamless development.

- [ ] Create/update `.vscode/settings.json`:
  ```json
  {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "eslint.experimental.useFlatConfig": true
  }
  ```
- [ ] Create `.vscode/extensions.json` with recommended extensions:
  - ESLint (`dbaeumer.vscode-eslint`)
  - Prettier (`esbenp.prettier-vscode`)

### Phase 2.7: Testing & Cleanup

**Goal**: Verify everything works, then format codebase.

- [ ] Test all scripts from root:
  - [ ] `pnpm run lint` - Should show any violations
  - [ ] `pnpm run format:check` - Should show files needing formatting
  - [ ] `pnpm run type-check` - Should pass in both workspaces
- [ ] Commit the configuration (NO formatting yet):
  ```bash
  git add .
  git commit -m "chore: add ESLint 9, Prettier, and TypeScript root configs"
  ```
- [ ] Run formatters (separate commit):
  ```bash
  pnpm run fix-all
  git add .
  git commit -m "chore: format codebase with Prettier and ESLint"
  ```
- [ ] Update `CLAUDE.md` and `ARCHITECTURE.md`:
  - Document linting/formatting commands
  - Add pre-commit hook recommendations (optional)

**Phase 2 Exit Criteria**:
- ✅ All linting/formatting scripts working from root
- ✅ Frontend and backend both passing type checks
- ✅ Consistent code style across monorepo
- ✅ Documentation updated
- ✅ Two separate commits (config setup vs formatting)

---

## Notes & Considerations

### TypeScript Migration Strategy
- Incremental file conversion (not all at once)
- Keep `allowJs: true` during transition if needed
- Focus on type safety in new code first

### ESLint 9 Breaking Changes
- Flat config is mandatory (no `.eslintrc` support)
- Some plugins may not support ESLint 9 yet (check compatibility)
- Fallback: Use ESLint 8.x if blockers found

### Prettier Opinionated Defaults
- Minimal config recommended (accept Prettier's opinions)
- Only override if team has strong preferences

### Git Hooks (Future Enhancement)
- Consider `husky` + `lint-staged` for pre-commit hooks
- Run `lint-fix` and `format` on staged files only
- Prevent commits with type errors

---

## Rollback Plan

If issues arise:

1. **Phase 1 Rollback**: Revert backend to `.js` files
   - Restore from git: `git checkout main -- backend/`
   - Remove TypeScript dependencies

2. **Phase 2 Rollback**: Remove root configs
   - Delete root `package.json`, `eslint.config.js`, `prettier.config.js`
   - Restore frontend to ESLint 8 config if needed
