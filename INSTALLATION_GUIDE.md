# Installation Guide — Code Eval Engine

## Prerequisites

Before installing, make sure the following are installed on your system:

| Requirement | Version | Download |
|-------------|---------|----------|
| Docker Desktop | 4.x or later | https://www.docker.com/products/docker-desktop |
| Node.js | 18.x or later | https://nodejs.org |
| npm | 9.x or later | Included with Node.js |
| Git | Any recent | https://git-scm.com |

> **Windows users:** Enable WSL2 in Docker Desktop settings (Settings → General → Use WSL2 based engine).

---

## Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd Leetcode_backend-main
```

---

## Step 2 — Configure Firebase (Firestore)

The backend uses Firebase Firestore for persistent storage.

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (or use an existing one)
3. Navigate to **Project Settings → Service Accounts**
4. Click **Generate new private key** — this downloads a JSON file
5. Place the file in the `server/` directory and rename it:

```
server/serviceAccountKey.json
```

---

## Step 3 — Build and Start Backend Services

All backend services (API server, worker, RabbitMQ, Redis) run in Docker.

```bash
# From the project root
docker compose build
docker compose up -d
```

This starts:
- **API Server** on port `9000`
- **RabbitMQ** message broker on ports `5672` / `15672`
- **Redis** cache on port `6379`
- **Worker** with a pool of 6 pre-warmed execution containers

Verify all services are running:

```bash
docker compose ps
```

Expected output:
```
NAME                              STATUS
leetcode_backend-main-rabbitmq-1   Up (healthy)
leetcode_backend-main-redis-server-1  Up (healthy)
leetcode_backend-main-server-1     Up (healthy)
leetcode_backend-main-worker-1     Up (healthy)
```

Check the worker initialized its container pool:

```bash
docker compose logs worker | grep "pool initialized"
# Expected: ✅ Container pool initialized with 6 containers
```

---

## Step 4 — Install and Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:3000` (or `3001` if 3000 is occupied).

---

## Step 5 — Verify the Installation

Open your browser and navigate to `http://localhost:3000`.

You should see the **Code Eval Engine** homepage with the problem list.

Test the backend API directly:

```bash
curl http://localhost:9000/
# Expected: {"status":"ok", ...}
```

---

## Environment Variables

All environment variables are pre-configured in `docker-compose.yml`. The defaults work out of the box:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7000` | Internal API port (mapped to 9000 externally) |
| `REDIS_HOST` | `redis-server` | Redis hostname within Docker network |
| `RABBITMQ_URL` | `amqp://rabbitmq:5672` | RabbitMQ connection URL |
| `CONTAINER_POOL_SIZE` | `6` | Number of pre-warmed sandbox containers |

---

## Stopping the Application

```bash
# Stop all services (data is preserved)
docker compose down

# Stop and remove all data volumes
docker compose down -v
```

---

## Troubleshooting

### Docker build fails
```bash
docker compose build --no-cache
```

### Worker fails to start
```bash
docker compose logs worker
# Most common: RabbitMQ not ready yet — wait 30 seconds and retry:
docker compose restart worker
```

### Frontend can't reach backend
- Confirm the backend is running: `curl http://localhost:9000/`
- Check that port 9000 is not blocked by a firewall

### Firebase permission errors
- Ensure `server/serviceAccountKey.json` exists and belongs to the correct Firebase project
- Check that Firestore is enabled in the Firebase console (Build → Firestore Database)
