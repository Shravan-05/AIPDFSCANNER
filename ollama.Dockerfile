FROM ollama/ollama:latest

EXPOSE 11434

ENV OLLAMA_MODEL=qwen2.5:0.5b
ENV OLLAMA_KEEP_ALIVE=24h

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD curl -sf http://localhost:11434/api/tags > /dev/null || exit 1

COPY start.sh /start.sh
RUN chmod +x /start.sh

ENTRYPOINT ["/start.sh"]
