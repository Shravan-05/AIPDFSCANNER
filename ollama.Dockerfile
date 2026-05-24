FROM ollama/ollama:latest

EXPOSE 11434

ENV OLLAMA_HOST=0.0.0.0
ENV OLLAMA_MODEL=llama3.2:1b
ENV OLLAMA_KEEP_ALIVE=24h

HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=5 \
  CMD ollama list 2>/dev/null | grep -q llama || exit 1

COPY start.sh /start.sh
RUN chmod +x /start.sh

ENTRYPOINT ["/start.sh"]
