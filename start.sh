#!/bin/sh
set -e

# Render sets PORT env var for web services — use it if provided
OLLAMA_PORT="${PORT:-11434}"
export OLLAMA_HOST="0.0.0.0"

ollama serve &
SERVER_PID=$!

echo "Waiting for Ollama server on port $OLLAMA_PORT..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${OLLAMA_PORT}/api/tags" > /dev/null 2>&1; then
    echo "Server ready"
    break
  fi
  sleep 2
done

if ! curl -sf "http://localhost:${OLLAMA_PORT}/api/tags" | grep -q "$OLLAMA_MODEL"; then
  echo "Pulling model $OLLAMA_MODEL..."
  ollama pull "$OLLAMA_MODEL"
else
  echo "Model $OLLAMA_MODEL already available"
fi

wait $SERVER_PID
