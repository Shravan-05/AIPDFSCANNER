# Render Deployment

This repo is ready to deploy as a **Render Blueprint** with two connected services:
1. **aipdfscanner** — Node web service (Express API + React frontend)
2. **ollama** — Private Docker service running Ollama with `llama3.2:1b`

## Plan Requirements

| Service | Min Plan | RAM | Why |
|---|---|---|---|
| aipdfscanner | Starter (free) | 512MB | Node + sharp + tesseract |
| ollama | **Professional ($20/mo)** | **4GB** | `llama3.2:1b` needs ~1.3GB RAM to load |

On the free Starter plan, Ollama will be **OOM-killed**. The app still works — it gracefully falls back to the built-in rule-based command parser for all basic operations (compress, delete, rotate, watermark, etc.).

## One-Click Blueprint Deploy

1. Push this repo to GitHub/GitLab
2. In Render Dashboard → Blueprint → Connect your repo
3. Render auto-detects `render.yaml` and prompts for settings
4. Fill in the required env vars when prompted:
   - `MONGODB_URI` — MongoDB Atlas connection string
   - `JWT_SECRET` — strong random secret
5. **Upgrade the Ollama service to Professional plan** in the Render dashboard if you want AI features

## How the services communicate

- The `ollama` private service is accessible at `http://ollama:11434` within Render's internal network
- The `aipdfscanner` web service auto-discovers it via `OLLAMA_API_URL=http://ollama:11434`
- A 10GB persistent disk is mounted at `/root/.ollama/models` so the model persists across restarts

## Environment Variables

### Web Service (aipdfscanner)
| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiry duration |
| `NODE_ENV` | No | `production` | Environment |
| `UPLOAD_DIR` | No | `/var/data/uploads` | File upload directory |
| `OLLAMA_API_URL` | No | `http://ollama:11434` | Ollama internal endpoint |
| `OLLAMA_MODEL` | No | `llama3.2:1b` | Ollama model name |

### Private Service (ollama)
Set in `render.yaml` — no manual configuration needed.

## Architecture

```
User → Render LB → aipdfscanner (Node, port 10000)
                        ↓ (Render Internal Network)
                    ollama (Docker, port 11434)
                        ↓
                    /root/.ollama/models/ (10GB persistent disk)
```

- The app works fully without Ollama — it falls back to the built-in rule-based command parser
- First deploy is slower (~2-3 min) as Render builds both services and Ollama downloads the model
- Subsequent deploys are faster thanks to build caching and the persistent disk

## Local Development

```bash
# Install dependencies
npm run install:all

# Start backend
npm run dev:backend

# Start frontend (separate terminal)
npm run dev:frontend
```

Make sure Ollama is running locally: `ollama serve`
