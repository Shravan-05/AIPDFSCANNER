#!/bin/bash
set -e

OLLAMA_PORT=11434
export OLLAMA_HOST=0.0.0.0
export OLLAMA_KEEP_ALIVE=24h

ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:$OLLAMA_PORT/api/tags > /dev/null 2>&1; then
    echo "Ollama ready"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "Ollama failed to start"
  fi
  sleep 2
done

if curl -sf http://localhost:$OLLAMA_PORT/api/tags | grep -q "$OLLAMA_MODEL"; then
  echo "Model $OLLAMA_MODEL already available"
else
  echo "Pulling $OLLAMA_MODEL..."
  ollama pull "$OLLAMA_MODEL" 2>&1 &
fi

cd backend
exec node index.js
