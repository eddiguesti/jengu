# Architectural Review and Improvement Plan

**Priority**: Highest
**Status**: Recommended
**Created**: 2025-10-17
**Generted by**: Gemini

## 1. Overview

This document provides a strategic architectural review of the Jengu codebase. The project has a solid technical foundation with a modern stack (React, Express, TypeScript, Supabase), but exhibits several architectural patterns that will hinder future development, scalability, and maintainability.

The following recommendations aim to:

- **Simplify the Codebase**: Reduce complexity and boilerplate, making the code easier to understand and modify.
- **Improve Developer Experience**: Introduce standard patterns and tools that streamline development.
- **Enhance AI Agent Collaboration**: Structure the code in a way that is more predictable and modular, allowing AI agents to work more effectively.
- **Increase Robustness**: Improve error handling, validation, and state management to build a more reliable application.

This plan builds upon and validates the existing tasks in `docs/tasks-todo/`, particularly regarding security, linting, and state management.

---

## 2. Backend Architecture Recommendations

The most significant architectural issue in the backend is the monolithic `backend/server.ts` file. While suitable for a prototype, it concentrates too many responsibilities in one place, making it difficult to maintain and scale.

### Recommendation 2.1: Refactor `server.ts` into a Standard Express Structure

The current 1500+ line `server.ts` should be broken down into a conventional folder structure. This separation of concerns is the single most important change for the backend's long-term health.

**Proposed Structure:**

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── index.ts         # Main router
│   │   │   ├── files.routes.ts
│   │   │   ├── analytics.routes.ts
│   │   │   └── settings.routes.ts
│   │   ├── controllers/
│   │   │   ├── files.controller.ts
│   │   │   ├── analytics.controller.ts
│   │   │   └── settings.controller.ts
│   │   ├── middlewares/
│   │   │   ├── authenticateUser.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimiter.ts
│   │   └── validators/
│   │       ├── index.ts         # Validation schemas using Zod
│   │       ├── files.validators.ts
│   │       └── settings.validators.ts
│   ├── services/                # (Already exists, good)
│   │   ├── dataTransform.ts
│   │   └── ...
│   ├── lib/                     # (Already exists, good)
│   │   └── supabase.ts
│   ├── config/
│   │   └── index.ts             # Centralized config
│   └── server.ts                # (New, lean entry point)
└── package.json
```

**Action Items:**

1.  **Create `src` directory:** Move all TypeScript source files into `backend/src`.
2.  **Isolate Routes:** For each resource (e.g., `files`, `analytics`), create a dedicated router file in `src/api/routes/`. These files will define the endpoints and link them to controller functions.
3.  **Create Controllers:** Move the request/response logic (the `async (req, res) => {}` functions) from `server.ts` into dedicated controller files in `src/api/controllers/`. Each function should handle a single endpoint.
4.  **Centralize Middleware:** Move middleware like `authenticateUser`, `rateLimit`, and the final error handler into `src/api/middlewares/`.
5.  **Create a Lean `server.ts`:** The root `server.ts` should only be responsible for initializing Express, applying global middleware, mounting the main router, and starting the server. It should be under 50 lines.

**AI Agent Benefit**: Smaller, single-responsibility files are vastly easier for an AI agent to understand and modify. An agent can be directed to "add a new endpoint in `files.routes.ts` and `files.controller.ts`" and work within a limited, predictable context.

### Recommendation 2.2: Implement Robust Input Validation with Zod

The current manual input validation is error-prone. Adopting a schema-based validation library like **Zod** will make validation declarative, safer, and more maintainable.

**Action Items:**

1.  **Add Zod:** `pnpm --filter backend add zod`.
2.  **Create Validator Schemas:** In `src/api/validators/`, define Zod schemas for request bodies, query params, and path params for each endpoint.
3.  **Create Validation Middleware:** Create a middleware that takes a Zod schema and validates `req.body`, `req.query`, or `req.params` against it. If validation fails, it should call the centralized error handler with a structured error.
4.  **Apply Middleware to Routes:** Apply the validation middleware in the route definitions before the controller is called.

**Example (`files.routes.ts`):**

```typescript
import { validate } from '../middlewares/validateRequest'
import { getFileDataSchema } from '../validators/files.validators'

router.get(
  '/:fileId/data',
  authenticateUser,
  validate(getFileDataSchema), // Zod validation middleware
  filesController.getFileData
)
```

**AI Agent Benefit**: Zod schemas are self-documenting and provide static type inference. An agent can easily understand the expected data shape for an endpoint and is less likely to introduce bugs related to invalid data.

---

## 3. Frontend Architecture Recommendations

The frontend suffers from inconsistent and imperative state management, leading to complex components and redundant data fetching. The existing task `task-3-improve-frontend-state-management.md` correctly identifies this and proposes an excellent solution.

### Recommendation 3.1: Aggressively Adopt TanStack Query for Server State

This is the most critical improvement for the frontend. The plan outlined in `task-3-improve-frontend-state-management.md` is comprehensive and should be implemented fully.

**Key Endorsements:**

- **Replace all `axios` calls in components:** All data fetching should be encapsulated in `useQuery` and `useMutation` hooks.
- **Eliminate Server State from Zustand:** Stores like `useDataStore` and `useBusinessStore` should be removed. Their state is server state and belongs in TanStack Query's cache.
- **Centralize API Logic:** Create custom hooks for each data resource (e.g., `useFiles`, `useAnalytics`, `useSettings`). The `Data.tsx` component is a prime example of what to refactor.

**AI Agent Benefit**: Declarative data fetching is much easier for an agent to reason about. Instead of parsing complex `useEffect` and `useState` logic, an agent can see a simple `const { data, isLoading } = useFiles();` and immediately understand the component's data dependencies.

### Recommendation 3.2: Standardize the API Client

The `Data.tsx` component contains manual `axios` calls with hardcoded URLs and manual token handling, ignoring the pattern described in `ARCHITECTURE.md`. This must be corrected.

**Action Items:**

1.  **Enforce Singleton `apiClient`:** Ensure all HTTP requests go through the centralized Axios instance defined in `frontend/src/lib/api/client.ts`.
2.  **Use Environment Variables:** The `baseURL` should be configured via `VITE_API_URL` and not hardcoded.
3.  **Refactor Manual Calls:** Hunt down and refactor all manual `axios` or `fetch` calls to use the `apiClient`.

**AI Agent Benefit**: A single, well-configured API client provides a consistent and predictable way to interact with the backend, reducing the chance of agents implementing incorrect authentication or URL logic.

### Recommendation 3.3: Adopt a Standard UI Component Library

The current `components/ui` directory contains a small set of custom components. While functional, building and maintaining a custom design system is a significant effort. Adopting a production-ready, headless component library can accelerate development and improve consistency.

**Recommendation:**

- Integrate **shadcn/ui**. It is built on Tailwind CSS and Radix UI, making it a perfect fit for the existing stack. It is not a traditional component library; instead, you use a CLI to add individual, fully-typed, and fully-customizable components directly into your codebase.

**Action Items:**

1.  **Initialize `shadcn/ui`:** Follow its documentation to set it up in the frontend workspace.
2.  **Replace Custom Components:** Gradually replace the existing components in `components/ui` with their `shadcn/ui` equivalents (e.g., replace custom `Button.tsx` with the `shadcn/ui` button).

**AI Agent Benefit**: `shadcn/ui` is extremely popular and well-documented. AI agents have extensive knowledge of its API and conventions, making it trivial for them to generate new UI features using the library, complete with proper styling and accessibility.

---

## 4. General & Monorepo Recommendations

### Recommendation 4.1: Enforce Code Quality

The task `task-2-fix-linting-errors.md` should be a high priority. A codebase with zero linting or type errors is a prerequisite for stable development.

**Action Items:**

1.  **Fix All Errors:** Dedicate time to fixing all issues reported by `pnpm run check-all`.
2.  **Implement Pre-commit Hooks:** Use **Husky** and **lint-staged** to automatically run `check-all` on staged files before every commit. This prevents new errors from ever entering the codebase.

**AI Agent Benefit**: A clean and consistent codebase is easier for an agent to parse and modify correctly. Pre-commit hooks also provide an immediate feedback loop if an agent generates code that violates project standards.

### Recommendation 4.2: Centralize Type Definitions

Currently, types are defined where they are used or in component-specific files. For types shared between the frontend and backend (especially API request/response payloads), a shared workspace package should be created.

**Action Items:**

1.  **Create a `packages/types` Workspace:** Create a new package within the `pnpm-workspace.yaml`.
2.  **Define Shared Types:** Use this package to define types for API payloads, database entities, etc. Zod schemas with type inference are perfect for this.
3.  **Use in Frontend & Backend:** Both the `frontend` and `backend` workspaces can now import types from this shared package, ensuring they never go out of sync.

**AI Agent Benefit**: A single source of truth for types makes it much easier for an agent to understand the data contracts between the frontend and backend.

---

## 5. Summary of Key Actions

1.  **Backend:** Break up `server.ts` into a standard `routes`/`controllers`/`services` structure.
2.  **Backend:** Introduce `Zod` for robust, schema-based input validation.
3.  **Frontend:** Fully implement the state management refactor using **TanStack Query**, as detailed in the existing task.
4.  **Frontend:** Consider adopting **shadcn/ui** to standardize the component library.
5.  **Monorepo:** Implement **pre-commit hooks** with Husky to enforce code quality.
6.  **Monorepo:** Create a shared `types` package to ensure type safety between frontend and backend.

By implementing these changes, the Jengu project will evolve from a promising prototype into a robust, scalable, and maintainable platform that is a pleasure to work on for both human developers and their AI assistants.
