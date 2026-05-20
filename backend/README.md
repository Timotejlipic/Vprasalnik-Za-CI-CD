# cicdq — C++ Backend

REST API backend for the CI/CD Pipeline Maturity Questionnaire application.  
Written in C++17, header-only dependencies, no external database.

## Requirements

| Tool | Minimum version |
|------|----------------|
| CMake | 3.20 |
| C++ compiler | GCC 9 / Clang 10 / MSVC 2019 (C++17) |
| Internet access | Required on first configure (FetchContent downloads dependencies) |

Dependencies are fetched automatically by CMake — no manual installation needed:

- [cpp-httplib](https://github.com/yhirose/cpp-httplib) v0.15.3 — header-only HTTP/1.1 server
- [nlohmann/json](https://github.com/nlohmann/json) v3.11.3 — header-only JSON

## Building

```sh
cmake -S . -B build
cmake --build build
```

On Windows with MSVC, specify a configuration explicitly:

```sh
cmake --build build --config Release
```

## Configuration

Copy `.env.example` to `.env` and adjust the values. The server reads these variables from the **process environment** at startup — `.env` is not loaded automatically; export the variables beforehand or prefix the run command.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | TCP port the server listens on |
| `JWT_SECRET` | `dev_secret_change_in_prod` | HMAC-SHA-256 signing key for JWTs — **change in production** |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Value sent in `Access-Control-Allow-Origin` |

### Linux / macOS

```sh
export JWT_SECRET=your_secret_here
./build/cicdq_server
```

### Windows (PowerShell)

```powershell
$env:JWT_SECRET = "your_secret_here"
.\build\Release\cicdq_server.exe
```

## Running

The server starts on the configured port and prints:

```
[cicdq] Backend listening on http://localhost:3002
```

A health-check endpoint is available at `GET /health` and returns `{"status":"ok"}`.

## Default credentials

The in-memory store is seeded with one admin account on startup:

| Username | Password |
|----------|----------|
| `admin` | `password` |

> **Note:** All data is stored in memory. It is reset every time the process restarts.

## API reference

All request and response bodies use `Content-Type: application/json`.  
Protected routes require an `Authorization: Bearer <token>` header.

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | — | Verify credentials, receive JWT |
| `POST` | `/api/auth/register` | — | Create an account, receive JWT |

**Login / register request body**

```json
{ "username": "alice", "password": "secret123" }
```

**Login / register response**

```json
{
  "token": "<jwt>",
  "user": { "id": "...", "username": "alice", "role": "user" }
}
```

---

### Pipelines

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/pipelines` | User | List pipelines belonging to the authenticated user |
| `POST` | `/api/pipelines` | User | Create a new pipeline assessment |
| `GET` | `/api/pipelines/:id` | Owner | Get a single pipeline |
| `PUT` | `/api/pipelines/:id` | Owner | Update a pipeline |
| `DELETE` | `/api/pipelines/:id` | Owner | Delete a pipeline |

**Pipeline object**

```json
{
  "id": "...",
  "userId": "...",
  "name": "my-pipeline",
  "repoId": "repo-abc",
  "assessor": "Jane",
  "repoLink": "https://github.com/org/repo",
  "date": "2025-01-15",
  "score": 70,
  "level": 3,
  "answers": { "b_cache": "DA", "b_logging": "NE" }
}
```

---

### Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/categories` | — | List all questionnaire categories and their items |
| `POST` | `/api/categories` | Admin | Create a category |
| `PUT` | `/api/categories/:id` | Admin | Update a category title |
| `DELETE` | `/api/categories/:id` | Admin | Delete a category |
| `POST` | `/api/categories/:id/items` | Admin | Add a question item to a category |
| `PUT` | `/api/categories/:id/items/:itemId` | Admin | Update a question item |
| `DELETE` | `/api/categories/:id/items/:itemId` | Admin | Delete a question item |

**Category object**

```json
{
  "id": "cat_build",
  "title": "Build",
  "items": [
    {
      "id": "b_cache",
      "label": "Dependency caching",
      "type": "yes_no_na",
      "description": "Is dependency caching used during the build?"
    }
  ]
}
```

Item `type` is either `"yes_no_na"` (radio: DA / NE / NA) or `"text"` (free-form).

---

### Maturity rules

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/rules` | — | List all maturity level definitions |
| `PUT` | `/api/rules/:level` | Admin | Update a maturity level definition |

**Rule object**

```json
{ "level": 3, "name": "Definirana", "description": "...", "minScore": 50 }
```

---

### Assessment

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/assessment/evaluate` | — | Compute score, maturity level, and recommendations |

**Request body**

```json
{
  "answers": { "b_cache": "DA", "b_logging": "NE", "b_other": "uses Gradle" }
}
```

Optionally pass `"categories"` and `"rules"` arrays to evaluate against a custom questionnaire instead of the server's current data.

**Response**

```json
{
  "score": 72,
  "level": 3,
  "levelName": "Definirana",
  "missing": [
    "Za dosego stopnje Kvantitativno upravljana potrebujete še 3 točk.",
    "Manjka v Build: Concurrency (multiple builds simultaneously)"
  ]
}
```

Score is a percentage (0–100) normalised over answerable items (NA answers are excluded).

---

## Project structure

```
backend/
├── CMakeLists.txt
├── .env.example
├── src/
│   └── main.cpp              # Entry point — server setup, CORS, route registration
└── include/
    └── cicdq/
        ├── crypto.hpp        # SHA-256, HMAC-SHA-256, Base64URL, UUID v4
        ├── jwt.hpp           # JWT HS256 sign / verify
        ├── types.hpp         # Domain structs with nlohmann::json serialisation
        ├── store.hpp         # Thread-safe in-memory repository
        ├── assessment.hpp    # Scoring logic
        ├── auth.hpp          # Bearer token extraction, response helpers
        └── routes/
            ├── auth.hpp
            ├── pipelines.hpp
            ├── categories.hpp
            ├── rules.hpp
            └── assessment.hpp
```

## Security notes

- Passwords are stored as `salt:SHA256(salt+password)`. This is intentionally simple for a demo — replace with bcrypt or Argon2 before any production use.
- JWTs are signed with HMAC-SHA-256. Tokens expire after 24 hours.
- Set a strong, random `JWT_SECRET` (32+ bytes) in any non-local environment.
- CORS is restricted to the single origin configured via `FRONTEND_ORIGIN`.
