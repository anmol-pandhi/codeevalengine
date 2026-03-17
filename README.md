# Code Eval Engine

A full-stack online code evaluation platform that executes user-submitted code inside isolated Docker containers. Built to demonstrate the performance advantage of a **container pool** architecture over traditional sequential code execution.

## What It Does

Users write solutions to programming problems in the browser. The code is sent to a backend that queues it via RabbitMQ, picks it up with a worker, runs it inside a sandboxed Docker container, and returns the result in real time over WebSocket.

The platform includes a **Benchmark page** that visually proves why the container pool approach is faster — by running the same 6 jobs in parallel (pool) vs one at a time (sequential) and comparing wall-clock times.

## Architecture

```
Browser (React)
    │
    ├── POST /api/submit ──────────────→ Express API Server
    │                                        │
    └── WebSocket (real-time results) ←──────┤
                                             │
                                        RabbitMQ Queue
                                             │
                                        Judge Worker
                                             │
                                    Container Pool (6 containers)
                                    ┌────┬────┬────┬────┬────┬────┐
                                    │ C1 │ C2 │ C3 │ C4 │ C5 │ C6 │
                                    └────┴────┴────┴────┴────┴────┘
                                             │
                                    Results → Redis → Firestore
```

- **API Server** (Express.js) — handles submissions, serves WebSocket updates, stores results
- **RabbitMQ** — job queue between the API and the worker
- **Judge Worker** — consumes jobs from the queue, manages the container pool
- **Container Pool** — 6 pre-warmed Docker containers, reused across submissions (no cold start)
- **Redis** — fast result caching (1-hour TTL)
- **Firestore** — persistent submission history

## Features

- Code editor with syntax highlighting (Monaco Editor — same as VS Code)
- Supports Python, JavaScript, C++, Java
- Real-time results via WebSocket
- Per-test-case output, runtime, and error display
- Submission history per user
- Admin panel to add problems
- Benchmark page comparing parallel vs sequential execution

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, Monaco Editor |
| API | Node.js, Express |
| Queue | RabbitMQ |
| Cache | Redis |
| Database | Firebase Firestore |
| Execution | Docker (sandboxed containers) |
| Real-time | WebSocket |

## Getting Started

See [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) for full setup instructions.

**Quick version:**

```bash
# 1. Add your Firebase service account key
cp your-key.json server/serviceAccountKey.json

# 2. Start backend
docker compose up -d

# 3. Start frontend
cd frontend && npm install && npm run dev
```

Or use the run script:

```bash
./run.sh
```

Open `http://localhost:3000`

## Documentation

| File | Description |
|------|-------------|
| [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) | Step-by-step setup from scratch |
| [USER_MANUAL.md](./USER_MANUAL.md) | How to use the application |
| [QUICKSTART.md](./QUICKSTART.md) | Quick reference for common commands |
| [CONTAINER_POOL_ARCHITECTURE.md](./CONTAINER_POOL_ARCHITECTURE.md) | Deep dive into the container pool design |

## The Benchmark

The core idea of this project is showing that **pre-warming containers** is significantly faster than spawning a new one per submission.

The Benchmark page fires 6 identical jobs and measures:
- **Pool** — all 6 run simultaneously, total time ≈ time of 1 job
- **Sequential** — jobs run one at a time, total time ≈ 6× a single job

On a typical run the pool is **5–6× faster** than sequential for the same workload.
