# ═══════════════════════════════════════════════════════════════════════════════
# Persistent Memory Server - Unified Memory Service
# ═══════════════════════════════════════════════════════════════════════════════
# Supports Personal and Professional editions via MEMORY_EDITION env var
#
# Build:
#   docker build -t makebooksai/memory-server:latest .
#
# Run (Personal Edition):
#   docker run -e MEMORY_EDITION=personal -p 8004:8004 makebooksai/memory-server
#
# Run (Professional Edition):
#   docker run -e MEMORY_EDITION=professional -p 8004:8004 makebooksai/memory-server
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

LABEL maintainer="makebooks.ai"
LABEL description="Persistent Memory Server - AI memory with semantic search"
LABEL version="6.0.0"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements-v5.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY server.py .
COPY services/ ./services/
COPY schema_v5_postgres.sql .

# Create non-root user for security
RUN useradd -m -u 1000 memoryuser && \
    chown -R memoryuser:memoryuser /app
USER memoryuser

# Default to personal edition (can be overridden)
ENV MEMORY_EDITION=personal
ENV MEMORY_SERVICE_PORT=8004
ENV MEMORY_SERVICE_HOST=0.0.0.0

# Expose Memory API port
EXPOSE 8004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8004/api/v5/health || exit 1

# Run server
CMD ["python", "server.py"]
