# flota

Backend profesional cu:
- FastAPI
- Poetry
- PostgreSQL
- Docker
- SQLAlchemy async
- Alembic
- Ruff
- Pytest

## Pornire locală

### Varianta Docker
```bash
docker compose up --build
```

### Varianta locală
```bash
poetry install
cp .env.example .env
poetry run uvicorn app.main:app --reload
```

## Migrații
```bash
poetry run alembic revision --autogenerate -m "init"
poetry run alembic upgrade head
```
