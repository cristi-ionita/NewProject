install:
	poetry install

run:
	poetry run uvicorn app.main:app --reload

lint:
	poetry run ruff check .

format:
	poetry run ruff format .

test:
	poetry run pytest

migrate:
	poetry run alembic upgrade head

makemigrations:
	poetry run alembic revision --autogenerate -m "$(m)"

docker-up:
	docker compose up --build

docker-down:
	docker compose down -v
