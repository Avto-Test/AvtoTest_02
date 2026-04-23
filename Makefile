.PHONY: help dev migrate test docker-up docker-down frontend install

help:
	@echo "AutoTest - available commands:"
	@echo "  make dev         - Run backend (uvicorn with reload)"
	@echo "  make migrate     - Run Alembic migrations (upgrade head)"
	@echo "  make test        - Run backend tests (pytest)"
	@echo "  make docker-up   - Start local Docker stack"
	@echo "  make docker-down - Stop local Docker stack"
	@echo "  make frontend    - Run Next.js dev server"
	@echo "  make install     - Install backend + ml as editable packages"

dev:
	cd backend && uvicorn main:app --reload

migrate:
	cd backend && alembic upgrade head

test:
	cd backend && pytest

docker-up:
	docker compose -f deploy/docker-compose.local.yml up

docker-down:
	docker compose -f deploy/docker-compose.local.yml down

frontend:
	cd frontend && npm run dev

install:
	pip install -e backend -e ml