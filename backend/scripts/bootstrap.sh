#!/usr/bin/env bash
set -euo pipefail

poetry install
poetry run pre-commit install || true

echo "=> Creez prima migrare"
poetry run alembic revision --autogenerate -m "init" || true

echo "=> Gata"
