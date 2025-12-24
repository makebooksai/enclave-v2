# ═══════════════════════════════════════════════════════════════════════════════
# Short-Term Memory (STM) Service
# ═══════════════════════════════════════════════════════════════════════════════
# Real-time conversation monitoring and emotional continuity
# Watches Claude Code transcripts and auto-batches memories
#
# Requires:
#   - Memory Server running (for memory API)
#   - Ollama running (for local LLM inference)
# ═══════════════════════════════════════════════════════════════════════════════

FROM node:20-alpine

LABEL maintainer="makebooks.ai"
LABEL description="STM - Short-Term Memory for AI continuity"
LABEL version="1.0.0"

WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Create non-root user
RUN adduser -D -u 1000 stmuser && \
    chown -R stmuser:stmuser /app
USER stmuser

# Environment defaults
ENV MEMORY_SERVICE_URL=http://memory:8004
ENV OLLAMA_URL=http://ollama:11434
ENV STM_MODEL=mistral:7b-instruct-v0.3
ENV TRANSCRIPT_DIR=/transcripts
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "console.log('STM Running')" || exit 1

# Run STM service
CMD ["node", "dist/index.js"]
