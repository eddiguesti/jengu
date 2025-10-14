.PHONY: install dev-install clean test lint format run-api docker-build docker-up docker-down db-init db-migrate

# Installation
install:
	pip install -r requirements.txt

dev-install:
	pip install -r requirements.txt
	pip install pytest pytest-cov black flake8 mypy

# Clean
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +

# Testing
test:
	pytest tests/ -v

test-cov:
	pytest tests/ --cov=core --cov=apps --cov-report=html

# Code Quality
lint:
	flake8 apps/ core/ tests/

format:
	black apps/ core/ tests/

type-check:
	mypy apps/ core/

# Run Applications
run-backend:
	cd backend && pnpm start

run-frontend:
	cd frontend && pnpm run dev

# Database
db-init:
	alembic init core/data/migrations

db-migrate:
	alembic revision --autogenerate -m "migration"

db-upgrade:
	alembic upgrade head

db-downgrade:
	alembic downgrade -1

# Docker
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Development
dev:
	make docker-up
	make run-api
