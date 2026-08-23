# Optional. Windows without `make`: use the README commands or `python scripts/run_dev.py`.

.PHONY: up test test-unit lint backup openapi

up:
	python scripts/run_dev.py

test-unit:
	python -m pytest backend/tests -q
	cd frontend && npm test

test: test-unit
	cd frontend && npm run build

lint:
	cd backend && python -m ruff check app tests
	cd backend && python -m ruff format --check app tests
	cd frontend && npx tsc -b --pretty false

backup:
	python scripts/backup.py --dry-run

openapi:
	python scripts/gen_openapi.py
