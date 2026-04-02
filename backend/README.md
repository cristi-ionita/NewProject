# 🚗 CarsManagement Backend

Backend-ul aplicației **CarsManagement**, construit cu FastAPI, PostgreSQL și SQLAlchemy Async.

---

## ⚙️ Stack

- **FastAPI**
- **SQLAlchemy (async)**
- **PostgreSQL**
- **Alembic** (migrations)
- **Poetry**
- **Pytest**
- **Docker & Docker Compose**

---

## 📦 Setup local (fără Docker)

```bash
cd backend
poetry install
```

### Config `.env`

Creează un fișier `.env`:

```env
APP_NAME=Flota API
APP_ENV=dev
DEBUG=true

DB_HOST=localhost
DB_PORT=5432
DB_NAME=cars_db
DB_USER=postgres
DB_PASSWORD=postgres

ADMIN_PASSWORD=admin
ADMIN_TOKEN_SECRET=secret
```

### Rulează aplicația

```bash
poetry run uvicorn app.main:app --reload
```

---

## 🐳 Setup cu Docker (recomandat)

```bash
docker compose up --build -d
```

Verificare:

```bash
docker compose ps
```

---

## 🧱 Migrations (Alembic)

### Rulează migrațiile

```bash
docker compose exec api alembic upgrade head
```

### Creează o migrație nouă

```bash
docker compose exec api alembic revision --autogenerate -m "message"
```

---

## 🧪 Testing

### Config test

Creează `.env.test`:

```env
APP_ENV=test
DEBUG=true

DB_HOST=localhost
DB_PORT=5432
DB_NAME=cars_test_db
DB_USER=postgres
DB_PASSWORD=postgres

ADMIN_PASSWORD=admin
ADMIN_TOKEN_SECRET=test-secret
```

### Creează DB de test (o singură dată)

```bash
docker compose exec db psql -U postgres -c "CREATE DATABASE cars_test_db;"
```

### Rulează migrațiile pe DB de test

```bash
APP_ENV_FILE=.env.test poetry run alembic upgrade head
```

### Rulează testele

```bash
APP_ENV_FILE=.env.test poetry run pytest
```

---

## 🧠 Tipuri de teste

- **Unit tests** – logică izolată
- **Schema tests** – validări Pydantic
- **Integration tests (DB)** – SQL real
- **API tests** – request → DB → response

---

## 🔁 Test DB isolation

Testele folosesc:

- tranzacții per test
- rollback automat

👉 fiecare test rulează pe DB curat

---

## 📁 Structură

```
app/
  api/
  core/
  db/
  schemas/
  services/

alembic/
tests/
```

---

## 🚀 Endpoint example

```
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/health
```

---

## 🔐 Autentificare

- Header: `Authorization: Bearer <token>`
- Admin protejat prin dependency

---

## 🧩 Notes

- Folosește PostgreSQL async (`asyncpg`)
- Nu folosi SQLite pentru producție
- Migrațiile trebuie validate înainte de rulare

---

## ✅ Status

- ✔️ Docker setup
- ✔️ Alembic migrations
- ✔️ Test DB separat
- ✔️ API tests reale
- ✔️ Backend stabil

---

## 📌 Next steps

- Frontend integration
- E2E tests
- CI/CD pipeline
