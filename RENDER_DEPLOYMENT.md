# Render Deployment

This repo is ready to run as one Render Web Service. Express serves the API and the built React app.

## Recommended Render settings

- Runtime: Node
- Build command: `npm run render-build`
- Start command: `npm start`
- Health check path: `/api/health`

The included `render.yaml` can be used as a Render Blueprint.

## Required environment variables

- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: strong random secret
- `NODE_ENV`: `production`
- `UPLOAD_DIR`: `/var/data/uploads` if using the included persistent disk

Optional:

- `CORS_ORIGIN`: set to your Render app URL if you later split frontend/backend. Leave unset for same-service deployment.
- `OLLAMA_API_URL`: URL for a reachable Ollama service. Do not use `localhost` on Render unless Ollama runs in the same service.
- `OLLAMA_MODEL`: model name, default `llama2`

## Notes

- Render's filesystem is ephemeral unless you add a persistent disk. The blueprint mounts `/var/data` and stores uploads in `/var/data/uploads`.
- If Ollama is not reachable, AI command parsing falls back to the local rule parser so the app still runs.
