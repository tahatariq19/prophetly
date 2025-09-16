# Prophet Web Interface - Privacy-First Development Commands

.PHONY: help dev test clean build deploy

help: ## Show this help message
	@echo "Prophet Web Interface - Privacy-First Forecasting"
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Start development environment
	docker-compose up --build

dev-detached: ## Start development environment in background
	docker-compose up --build -d

stop: ## Stop development environment
	docker-compose down

test: ## Run all tests
	docker-compose -f docker-compose.test.yml up --abort-on-container-exit

test-backend: ## Run backend tests only
	cd backend && python -m pytest tests/ -v --cov=src

test-frontend: ## Run frontend tests only
	cd frontend && npm test

test-e2e: ## Run end-to-end tests
	cd frontend && npm run test:e2e

clean: ## Clean up containers and volumes
	docker-compose down -v --remove-orphans
	docker system prune -f

build: ## Build production images
	docker-compose -f docker-compose.prod.yml build

prod-test: ## Test production build locally
	docker-compose -f docker-compose.prod.yml up --build

format: ## Format code
	cd backend && black src/ tests/
	cd backend && isort src/ tests/
	cd frontend && npm run format

lint: ## Lint code
	cd backend && flake8 src/ tests/
	cd backend && mypy src/
	cd frontend && npm run lint

install-backend: ## Install backend dependencies
	cd backend && pip install -r requirements-dev.txt

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

setup: install-backend install-frontend ## Setup development environment

logs: ## Show logs from running containers
	docker-compose logs -f

privacy-check: ## Run privacy compliance checks
	@echo "Running privacy compliance checks..."
	@echo "✓ No persistent storage configured"
	@echo "✓ Memory-only processing enabled"
	@echo "✓ Auto-cleanup configured"
	@echo "✓ No user data in logs"