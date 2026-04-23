BACKEND_VENV := backend/.venv
PYTHON := $(BACKEND_VENV)/bin/python
PIP := $(BACKEND_VENV)/bin/pip
UVICORN := $(BACKEND_VENV)/bin/uvicorn
PYTEST := $(BACKEND_VENV)/bin/pytest

.PHONY: setup setup-backend setup-frontend backend frontend test-backend lint-frontend typecheck-frontend

setup: setup-backend setup-frontend

$(BACKEND_VENV):
	python3 -m venv $(BACKEND_VENV)

setup-backend: $(BACKEND_VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r backend/requirements.txt

setup-frontend:
	cd frontend && npm install

backend:
	cd backend && ../$(UVICORN) app.main:app --reload --port 8010

frontend:
	cd frontend && npm run dev

test-backend:
	cd backend && ../$(PYTEST)

lint-frontend:
	cd frontend && npm run lint

typecheck-frontend:
	cd frontend && npm run typecheck
