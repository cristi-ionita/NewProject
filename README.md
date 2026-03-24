# 🚗 CarsManagement

A full-stack application for managing vehicles, users, and usage sessions, including issue reporting and administrative workflows.

---

## 🧱 Tech Stack

### Backend

- FastAPI
- SQLAlchemy
- Alembic
- Poetry

### Frontend

- React
- TypeScript
- Vite

---

## ✨ Features

### 🔐 Authentication

- User login
- Admin login
- JWT-based authentication

### 🚘 Vehicle Management

- CRUD operations for vehicles (admin)
- Assign vehicles to users

### 📋 Vehicle Assignment

- Start / end usage sessions

### 📝 Vehicle Handover Reports

- Pickup report
- Return report

### 📚 Vehicle History

- Full history tracking per vehicle

### ⚙️ Admin Panel

- Manage users
- Manage vehicles

### ⚠️ Vehicle Issues

- Users can report issues
- Admin can:
  - View all issues
  - Update issue status:
    - `OPEN`
    - `IN_PROGRESS`
    - `RESOLVED`

  - Add admin comments

---

## 📁 Project Structure

```bash
CarsManagement/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── main.py
│   ├── alembic/
│   ├── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── types/
│   │   └── main.tsx
│   ├── package.json
│
└── README.md
```

---

## ⚙️ Backend Setup

### 1. Install dependencies

```bash
cd backend
poetry install
```

### 2. Activate virtual environment

```bash
poetry shell
```

### 3. Configure database

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/cars_db
```

### 4. Run migrations

```bash
alembic upgrade head
```

### 5. Start server

```bash
uvicorn app.main:app --reload
```

Backend runs on:

```
http://localhost:8000
```

API docs:

```
http://localhost:8000/docs
```

---

## 💻 Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Start development server

```bash
npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---

## 🔑 Authentication

JWT token is stored in:

```
localStorage
```

Sent in requests as:

```
Authorization: Bearer <token>
```

---

## 📡 API Endpoints (Relevant)

### Vehicle Issues

```
POST   /vehicle-issues        (user)
GET    /vehicle-issues        (admin)
PUT    /vehicle-issues/{id}   (admin)
```

---

## 🔄 Vehicle Issue Workflow

1. User creates an issue → `OPEN`
2. Admin updates:
   - sets `IN_PROGRESS`
   - adds comments

3. Admin resolves → `RESOLVED`

---

## 🧪 Development Notes

- Use `alembic revision --autogenerate` for migrations
- Backend runs on port `8000`
- Frontend runs on port `5173`
- Make sure CORS is properly configured in development

---

## 🚀 TODO

- Issue filtering (OPEN / RESOLVED)
- Dashboard with counters
- User notifications
- Image upload for issues
- Pagination and search

---

## 👤 Author

       Cristi Ionita
