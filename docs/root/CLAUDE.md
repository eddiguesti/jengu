# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Structure

- **This file (CLAUDE.md)** - High-level guidance, principles, and quick-start
- **`docs/developer/ARCHITECTURE.md`** - Detailed technical architecture, directory structures, and "where to put code" guide
- **`docs/developer/SUPABASE_SECURITY.md`** - Supabase security patterns and best practices
- **`docs/developer/`** - Evergreen developer documentation for specific subsystems
- **`docs/tasks.md`** - Task management system

**Always check `docs/developer/` for detailed documentation before making architectural changes.**

## Project Overview

Jengu is a dynamic pricing intelligence platform for hospitality businesses. Full-stack TypeScript monorepo:

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React 18 + TypeScript SPA
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (JWT)
- **Monorepo**: pnpm workspaces
- **Code Quality**: ESLint 9 + Prettier + TypeScript strict mode

## Technology Stack

### Backend

- **Runtime**: Node.js 20+ with ES modules
- **Language**: TypeScript 5+ (strict mode)
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL (via Supabase JS Client)
- **Auth**: Supabase Auth with JWT validation
- **File Processing**: Streaming CSV with multer + csv-parser
- **Package Manager**: **pnpm** (always use pnpm, not npm)
- **Dev Server**: tsx watch (auto-restart on changes)

### Frontend

- **Framework**: React 18 + TypeScript (strict mode)
- **Build**: Vite (with HMR)
- **Styling**: Tailwind CSS
- **State**: Zustand stores
- **Routing**: React Router v6
- **Charts**: Recharts
- **Animations**: Framer Motion

... (truncated for brevity - full guidance available in the original file)
