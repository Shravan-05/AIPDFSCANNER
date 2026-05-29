#!/bin/bash
set -e

OLLAMA_PORT=11434
MODEL=${OLLAMA_MODEL:-qwen2.5:0.5b}
export OLLAMA_HOST=0.0.0.0
export OLLAMA_KEEP_ALIVE=24h

# Install Ollama if missing (build step may have done this already)
if ! command -v ollama &>/dev/null; then
  echo "Downloading Ollama..."
  curl -fsSL https://ollama.com/download/ollama-linux-amd64.tgz -o /tmp/ollama.tgz
  tar -C /usr/local -xzf /tmp/ollama.tgz
  rm /tmp/ollama.tgz
  echo "Ollama installed"
fi

ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:$OLLAMA_PORT/api/tags > /dev/null 2>&1; then
    echo "Ollama ready"
    break
  fi
  if [ $i -eq 60 ]; then echo "Ollama startup failed, continuing..."; fi
  sleep 2
done

echo "Checking model $MODEL..."
if curl -sf http://localhost:$OLLAMA_PORT/api/tags | grep -q "$MODEL"; then
  echo "Model already cached"
else
  echo "Pulling $MODEL (first deploy takes ~1-2 min)..."
  ollama pull "$MODEL"
  echo "Model ready"
fi

echo "Starting Node.js app..."
cd backend
exec node index.js
