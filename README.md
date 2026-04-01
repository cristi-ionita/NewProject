# CarsManagement

CarsManagement este o aplicație pentru administrarea unei flote auto și a utilizatorilor care folosesc mașinile din companie.

## Funcționalități principale

- autentificare utilizator (cod + PIN)
- autentificare admin
- management utilizatori
- management vehicule
- sesiuni active pentru mașini
- preluare și predare vehicul
- istoric vehicule
- raportare probleme
- profil angajat (EmployeeProfile)

## Structură proiect

frontend/
backend/

## Tehnologii

### Backend

- FastAPI
- SQLAlchemy Async
- PostgreSQL
- Alembic
- Poetry
- Pytest

### Frontend

- React
- TypeScript
- Vite
- React Router

## Pornire proiect

### Backend

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```
