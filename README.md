# 🚗 Cars Management System

Full-stack application for managing employees, vehicles, documents, and internal workflows.

Built with:

- **Backend:** FastAPI + PostgreSQL + Alembic
- **Frontend:** Next.js (App Router) + React + Tailwind
- **Testing:** Pytest (backend), Vitest + Testing Library (frontend)
- **Infrastructure:** Docker (Docker Compose)

---

## ✨ Features

### 👤 Users

- Create users (employee / mechanic)
- Activate / deactivate users
- Reset PIN
- Unique access via code

### 🔐 Authentication

- Admin login (password)
- Employee login (PIN)
- Mechanic login (PIN)

### 📄 Documents

- Upload personal documents
- Filter by type/category
- Expiration support

### 🚗 Vehicles & Issues

- Assign vehicles
- Report issues
- Track maintenance

### 📅 Leave Management

- Request leave
- Track active leave users
- Filter users by status

---

## 🧱 Tech Stack

### Backend

- FastAPI
- SQLAlchemy (async)
- PostgreSQL
- Alembic (migrations)

### Frontend

- Next.js (App Router)
- React 19
- Tailwind CSS
- React Query

### Testing

- Pytest (integration tests)
- Vitest + Testing Library (UI tests)

---

## 🚀 Getting Started

### 1. Clone project

```bash
git clone <repo-url>
cd CarsManagement
```
