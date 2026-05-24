FROM ollama/ollama:latest

EXPOSE 11434

ENV OLLAMA_HOST=0.0.0.0
ENV OLLAMA_MODEL=llama3.2:1b
ENV OLLAMA_KEEP_ALIVE=24h

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD ollama list | grep -q "$OLLAMA_MODEL" || exit 1

RUN printf '#!/bin/sh\n\
set -e\n\
ollama serve &\n\
SERVER_PID=$!\n\
\n\
echo "Waiting for Ollama server to start..."\n\
for i in $(seq 1 30); do\n\
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then\n\
    echo "Server ready"\n\
    break\n\
  fi\n\
  sleep 2\n\
done\n\
\n\
if ! curl -s http://localhost:11434/api/tags | grep -q "$OLLAMA_MODEL"; then\n\
  echo "Pulling model $OLLAMA_MODEL..."\n\
  ollama pull "$OLLAMA_MODEL"\n\
else\n\
  echo "Model $OLLAMA_MODEL already available"\n\
fi\n\
\n\
wait $SERVER_PID\n' > /start.sh && chmod +x /start.sh

ENTRYPOINT ["/start.sh"]
