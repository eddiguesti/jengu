# Running the backend with Docker

This describes a simple way to run the `backend` service using Docker without installing Node locally.

Prerequisites:
- Docker Engine (or Docker Desktop) installed

Build and run (development):

```bash
cd backend
docker compose -f docker-compose.dev.yml up --build
```

This starts the backend on port `3001` (mapped to the host) and an optional `redis` service on `6379`.

Notes:
- The compose file mounts the backend folder into the container so code changes are visible inside the container.
- Environment variables are read from `backend/.env` if present, otherwise the compose file sets a few defaults.
- If you prefer to run in production mode, build with `npm run build` and change the `CMD` in the `Dockerfile` to `npm start`.
