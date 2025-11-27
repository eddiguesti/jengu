# Makefile - convenience commands for local development

.PHONY: check-tools install-pnpm install deps backend-dev backend-docker docker-up health

check-tools:
	@echo "Checking required tools..."
	@command -v node > /dev/null 2>&1 && echo "node: $(shell node -v)" || echo "node: NOT FOUND"
	@command -v pnpm > /dev/null 2>&1 && echo "pnpm: $(shell pnpm -v)" || echo "pnpm: NOT FOUND"
	@command -v docker > /dev/null 2>&1 && echo "docker: $(shell docker -v)" || echo "docker: NOT FOUND"

# Install pnpm globally if Node/npm is available. This will attempt to use corepack if present.
install-pnpm:
	@if command -v node > /dev/null 2>&1; then \
		if command -v corepack > /dev/null 2>&1; then \
			echo "Enabling corepack and preparing pnpm..."; \
			corepack enable && corepack prepare pnpm@latest --activate; \
		else \
			echo "Installing pnpm via npm..."; npm install -g pnpm; \
		fi; \
	else \
		echo "Node is not installed. Please install Node 20+ first."; exit 1; \
	fi

deps:
	@echo "Install workspace dependencies (pnpm)"
	@pnpm install

backend-dev:
	@echo "Start backend dev server (tsx watch)"
	@pnpm --filter backend run dev

backend-docker:
	@echo "Run backend via docker compose (development)"
	@cd backend && docker compose -f docker-compose.dev.yml up --build

docker-up:
	@echo "Bring up docker compose for backend (with redis)"
	@cd backend && docker compose -f docker-compose.dev.yml up -d --build

health:
	@echo "Query backend health endpoint"
	@curl -sS http://localhost:3001/health || echo "No response from http://localhost:3001/health"
