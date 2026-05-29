FROM node:20-bookworm-slim AS ollama
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://ollama.com/install.sh | sh

FROM ollama
WORKDIR /app

COPY package.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN npm ci --prefix backend && npm ci --prefix frontend
RUN npm run build --prefix frontend || true

COPY . .

EXPOSE 10000 11434

ENV OLLAMA_HOST=0.0.0.0
ENV OLLAMA_MODEL=qwen2.5:0.5b
ENV OLLAMA_KEEP_ALIVE=24h
ENV PORT=10000
ENV OLLAMA_DEPLOYED=true
ENV OLLAMA_API_URL=http://localhost:11434
ENV LLM_PROVIDER=ollama

COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
