#!/bin/sh
set -e

ollama serve &
SERVER_PID=$!

echo "Waiting for Ollama server to start..."
for i in $(seq 1 30); do
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "Server ready"
    break
  fi
  sleep 2
done

if ! curl -s http://localhost:11434/api/tags | grep -q "$OLLAMA_MODEL"; then
  echo "Pulling model $OLLAMA_MODEL..."
  ollama pull "$OLLAMA_MODEL"
else
  echo "Model $OLLAMA_MODEL already available"
fi

wait $SERVER_PID
