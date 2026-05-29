#!/bin/sh
set -e

# Start Ollama in background
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "Waiting for Ollama..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "Ollama ready"
    break
  fi
  sleep 2
done

# Pull model if needed
if ! curl -sf http://localhost:11434/api/tags | grep -q "$OLLAMA_MODEL"; then
  echo "Pulling $OLLAMA_MODEL..."
  ollama pull "$OLLAMA_MODEL"
fi

# Start Node.js app
echo "Starting Node.js app..."
exec npm start
