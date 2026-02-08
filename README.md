# AUTOTEST Backend

AUTOTEST is a comprehensive online testing and diagnostic platform built with **FastAPI**, **PostgreSQL**, and **Docker**. It supports user authentication, role-based access control (RBAC), test taking, analytics, and premium subscriptions via Stripe.

## Features

- **Authentication**: JWT-based auth (Register, Login, Email Verification).
- **Core Functionality**:
  - Create and manage tests (Admin only).
  - Take tests (Attempts) and view scores.
  - Review attempt history.
- **Analytics**:
  - User: Performance summary, per-test stats.
  - Admin: Global stats, top performing tests.
- **Monetization**:
  - Free tier: Limited daily attempts (3/day).
  - Premium tier: Unlimited attempts (Stripe integration).
- **Security**:
  - Encrypted passwords (bcrypt).
  - Role-based protection (User vs Admin).
  - Rate limiting on auth endpoints.
- **Infrastructure**:
  - Async Database (SQLAlchemy 2.0 + asyncpg).
  - Alembic Migrations.
  - Dockerized production ready setup.
  - Comprehensive Test Suite (pytest).

## Tech Stack

- **Python 3.11+**
- **FastAPI**
- **PostgreSQL**
- **SQLAlchemy 2.0**
- **Alembic**
- **Pydantic Settings**
- **Pytest**

## Setup & Installation

### Prerequisites

- Docker & Docker Compose
- Python 3.11+ (for local dev)
- PostgreSQL (for local dev)

### Option 1: Docker (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/autotest.git
    cd autotest
    ```

2.  **Environment Setup:**
    ```bash
    cp .env.example .env
    # Edit .env with your credentials (DB, Secret Key, Stripe keys)
    ```

3.  **Build and Run:**
    ```bash
    docker build -t autotest-backend .
    docker run -p 8000:8000 --env-file .env autotest-backend
    ```
    *(Note: For a full stack setup including DB, use a `docker-compose.yml` if available, otherwise ensure DB is accessible).*

### Option 2: Local Development

1.  **Create Virtual Environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ```

2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Database Config:**
    - Ensure PostgreSQL is running.
    - Update `DATABASE_URL` in `.env`.
    - Run migrations:
      ```bash
      alembic upgrade head
      ```

4.  **Run Application:**
    ```bash
    uvicorn main:app --reload
    ```

5.  **Access Documentation:**
    - Swagger UI: `http://localhost:8000/docs`
    - ReDoc: `http://localhost:8000/redoc`

## Running Tests

The project includes a comprehensive async test suite.

1.  **Install Test Dependencies:**
    ```bash
    pip install pytest pytest-asyncio httpx
    ```

2.  **Run Tests:**
    ```bash
    pytest
    ```

## API Reference

### Auth
- `POST /auth/register`: Create account.
- `POST /auth/login`: login and get JWT.
- `POST /auth/verify`: Verify email.

### Tests & Attempts
- `POST /attempts/start`: Start a test.
- `POST /attempts/answer`: Submit answer.
- `POST /attempts/finish`: Get score.

### Admin
- CRUD operations for Tests, Questions, and Answer Options. (Protected)

### Analytics
- `GET /analytics/me/summary`: User stats.
- `GET /analytics/admin/summary`: Platform stats.

### Payments
- `POST /payments/checkout`: Get Stripe payment link.
- `POST /payments/webhook`: Stripe webhook handler.

## Project Structure

```
.
├── alembic/                # Database migrations
├── api/                    # API Route handlers
│   ├── admin/
│   ├── analytics/
│   ├── attempts/
│   ├── auth/
│   └── payments/
├── core/                   # Config, Security, Logging
├── database/               # DB Session & Base models
├── middleware/             # Rate limit, Error handling
├── models/                 # SQLAlchemy Models
├── tests/                  # Automated Tests
├── main.py                 # App Entrypoint
├── Dockerfile              # Docker build
├── pytest.ini              # Test config
└── requirements.txt        # Dependencies
```
