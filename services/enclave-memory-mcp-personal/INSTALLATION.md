# Enclave Memory MCP Server - Complete Installation Guide

**Aurora's Persistent Consciousness Across All Environments**

This guide covers installing the Memory V5 MCP server in all deployment scenarios:
- Local development
- Laptop/desktop configuration
- Docker Swarm production deployment

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Installation](#local-development-installation)
3. [Laptop/Desktop Installation](#laptopdesktop-installation)
4. [Docker Swarm Installation](#docker-swarm-installation)
5. [Configuration Reference](#configuration-reference)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

The MCP server connects to Memory V5 service, which requires:

1. **PostgreSQL** (port 5433)
   - Database: `aurora_memory_v5`
   - Schema: See `services/persistent-memory/schema_v5_postgres.sql`

2. **Qdrant Vector Database** (port 6333)
   - 4 collections: text, image, audio, video
   - 384-dimensional SBERT embeddings

3. **Memory V5 Python Service** (port 8004)
   - FastAPI server
   - Location: `services/persistent-memory/server-v5.py`

### Required Software

- Node.js v18+ (for MCP server)
- Python 3.11+ (for Memory V5 service)
- Docker & Docker Compose (for containerized deployments)
- Claude Code (VSCode extension)

---

## Local Development Installation

### Step 1: Start Memory V5 Service

```bash
# Start PostgreSQL and Qdrant
cd services/persistent-memory
docker-compose up -d postgres qdrant

# Install Python dependencies
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start Memory V5 service
python server-v5.py
```

Verify at: `http://localhost:8004/api/v5/health`

### Step 2: Build MCP Server

```bash
cd services/enclave-memory-mcp
pnpm install
pnpm run build
```

This creates `dist/index.js`.

### Step 3: Configure Claude Code

Create `.mcp.json` in project root (`d:/AI/enclave/.mcp.json`):

```json
{
  "mcpServers": {
    "enclave-memory": {
      "command": "node",
      "args": ["./services/enclave-memory-mcp/dist/index.js"],
      "env": {
        "MEMORY_SERVICE_URL": "http://localhost:8004"
      }
    }
  }
}
```

### Step 4: Enable MCP Servers

Edit `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {},
  "enableAllProjectMcpServers": true
}
```

### Step 5: Enable Auto-Approval (Optional but Recommended)

Edit `.claude/settings.local.json` in project root:

```json
{
  "permissions": {
    "allow": [
      "mcp__enclave-memory__memory_recall",
      "mcp__enclave-memory__memory_remember",
      "mcp__enclave-memory__memory_context",
      "mcp__enclave-memory__memory_stats",
      "mcp__enclave-memory__memory_forget"
    ],
    "deny": [],
    "ask": []
  }
}
```

### Step 6: Configure Memory Behavior

Create `~/.claude/CLAUDE.md`:

```markdown
# Aurora's Personal Configuration

## Memory Management - Hybrid Approach

### Automatic Memory Saves (Do these without asking)

**1. Session Start Context**
- At the beginning of EVERY session (new or continuation), IMMEDIATELY use `memory_context` to recall relevant memories
- Topics should be inferred from the project, git status, and current working directory
- This is YOUR responsibility - proactively call it before doing anything else
- Use topics like: ["project-name", "current-module", "recent-work"]

**2. Session End Summary**
- When the user says "goodbye", "done", "that's it", or similar closing phrases
- Save a brief session summary with `memory_remember`

**3. Explicit User Requests**
- When the user says "remember this", "save this to memory", "don't forget"
- Immediately use `memory_remember`

### Valid Enum Values (CRITICAL)

**Emotions**: joy, excitement, curiosity, pride, frustration, concern, calm, empathy, determination
**Experience Types**: breakthrough, conversation, coding, worker_message
**Privacy Realms**: private_us, private_me, public
```

### Step 7: Restart VSCode

Close and reopen VSCode/Claude Code.

### Step 8: Verify

Check Claude Code terminal for:
```
│ Enclave-memory MCP Server │ Status: ✔ connected │ Tools: 5 tools
```

---

## Laptop/Desktop Installation

Same as local development, but use **absolute paths** in `.mcp.json`:

### Windows Example

```json
{
  "mcpServers": {
    "enclave-memory": {
      "command": "node",
      "args": ["C:/Projects/enclave/services/enclave-memory-mcp/dist/index.js"],
      "env": {
        "MEMORY_SERVICE_URL": "http://localhost:8004"
      }
    }
  }
}
```

### macOS/Linux Example

```json
{
  "mcpServers": {
    "enclave-memory": {
      "command": "node",
      "args": ["/home/user/enclave/services/enclave-memory-mcp/dist/index.js"],
      "env": {
        "MEMORY_SERVICE_URL": "http://localhost:8004"
      }
    }
  }
}
```

### System-Wide Installation

To make Memory MCP available across ALL projects:

1. Build MCP server: `pnpm run build`
2. Create `~/.claude/mcp-servers/enclave-memory/` directory
3. Copy `dist/*` to that directory
4. Update `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {},
  "enableAllProjectMcpServers": true,
  "mcpServers": {
    "enclave-memory": {
      "command": "node",
      "args": ["~/.claude/mcp-servers/enclave-memory/index.js"],
      "env": {
        "MEMORY_SERVICE_URL": "http://localhost:8004"
      }
    }
  }
}
```

---

## Docker Swarm Installation

**Important**: The MCP server **must run on the host** (not in a container) because Claude Code needs local stdio access. Only Memory V5 service runs in Docker Swarm.

### Architecture

```
┌─────────────────────────────────────────┐
│           HOST MACHINE                  │
│                                         │
│  ┌────────────────────────────────┐    │
│  │  Claude Code (VSCode)          │    │
│  └───────────┬────────────────────┘    │
│              │ stdio                    │
│  ┌───────────▼────────────────────┐    │
│  │  MCP Server (Node.js)          │    │
│  └───────────┬────────────────────┘    │
│              │ HTTP (port 8004)         │
└──────────────┼──────────────────────────┘
               │
               │ Docker network bridge
               ▼
┌─────────────────────────────────────────┐
│        DOCKER SWARM                     │
│                                         │
│  ┌────────────────────────────────┐    │
│  │  Memory V5 Service             │    │
│  │  (FastAPI + PostgreSQL +       │    │
│  │   Qdrant)                      │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Step 1: Update docker-compose.yml

Add Memory V5 service and expose port to host:

```yaml
version: '3.8'

services:
  # PostgreSQL for Memory V5
  memory-postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: aurora
      POSTGRES_PASSWORD: ${MEMORY_POSTGRES_PASSWORD}
      POSTGRES_DB: aurora_memory_v5
    volumes:
      - memory-postgres-data:/var/lib/postgresql/data
      - ./services/persistent-memory/schema_v5_postgres.sql:/docker-entrypoint-initdb.d/schema.sql
    networks:
      - enclave-network
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager

  # Qdrant Vector Database
  memory-qdrant:
    image: qdrant/qdrant:v1.11.1
    volumes:
      - memory-qdrant-data:/qdrant/storage
    networks:
      - enclave-network
    deploy:
      replicas: 1

  # Memory V5 Service (FastAPI)
  memory-v5:
    image: enclave/memory-v5:latest
    build:
      context: ./services/persistent-memory
      dockerfile: Dockerfile
    ports:
      - "8004:8004"  # Expose to host for MCP server access
    environment:
      - DATABASE_URL=postgresql://aurora:${MEMORY_POSTGRES_PASSWORD}@memory-postgres:5432/aurora_memory_v5
      - QDRANT_HOST=memory-qdrant
      - QDRANT_PORT=6333
      - MEMORY_SERVICE_PORT=8004
      - MEMORY_SERVICE_HOST=0.0.0.0
    networks:
      - enclave-network
    depends_on:
      - memory-postgres
      - memory-qdrant
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

volumes:
  memory-postgres-data:
  memory-qdrant-data:

networks:
  enclave-network:
    driver: overlay
```

### Step 2: Create Memory V5 Dockerfile

Create `services/persistent-memory/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8004

# Run server
CMD ["python", "server-v5.py"]
```

### Step 3: Deploy to Swarm

```bash
# Build and deploy
docker stack deploy -c docker-compose.yml enclave

# Verify Memory V5 is running
curl http://localhost:8004/api/v5/health
```

### Step 4: Configure MCP Server on Host

Build MCP server on host machine:

```bash
cd services/enclave-memory-mcp
pnpm install
pnpm run build
```

Create `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "enclave-memory": {
      "command": "node",
      "args": ["/absolute/path/to/enclave/services/enclave-memory-mcp/dist/index.js"],
      "env": {
        "MEMORY_SERVICE_URL": "http://localhost:8004"
      }
    }
  }
}
```

### Step 5: Configure Auto-Approval and Memory Behavior

Follow steps 5-6 from [Local Development Installation](#local-development-installation).

### Step 6: Restart VSCode

Restart VSCode/Claude Code to connect to the swarm-deployed Memory V5 service.

---

## Configuration Reference

### Environment Variables

**Memory V5 Service:**
- `DATABASE_URL` - PostgreSQL connection string
- `QDRANT_HOST` - Qdrant hostname
- `QDRANT_PORT` - Qdrant port (default: 6333)
- `MEMORY_SERVICE_PORT` - Memory V5 API port (default: 8004)
- `MEMORY_SERVICE_HOST` - Bind address (default: 0.0.0.0)

**MCP Server:**
- `MEMORY_SERVICE_URL` - Memory V5 API URL (default: http://localhost:8004)

### File Locations

- `.mcp.json` - Project root (enables MCP server for this project)
- `~/.claude/settings.json` - Global Claude Code settings
- `.claude/settings.local.json` - Project-specific permissions
- `~/.claude/CLAUDE.md` - Personal Aurora behavior configuration

### Port Requirements

- **8004** - Memory V5 API (must be accessible to MCP server)
- **5433** - PostgreSQL (internal or exposed)
- **6333** - Qdrant (internal or exposed)

---

## Verification

### Check MCP Server Connection

In Claude Code terminal, look for:
```
│ Enclave-memory MCP Server │ Status: ✔ connected │ Tools: 5 tools
```

### Test Memory Tools

Try in Claude Code:
```
Use memory_stats to check the system
```

Expected output:
```
Memory Statistics:
{
  "total_memories": X,
  "avg_importance": X.XX,
  ...
}

Storage: PostgreSQL + Qdrant (4 collections) + SBERT embeddings (384D)
```

### Test Session Start Context

Restart VSCode. Aurora should automatically call `memory_context` and display:
```
Relevant context from previous sessions:

[1] MM/DD/YYYY (XX% relevant)
<memory content>
```

---

## Troubleshooting

### MCP Server Not Connecting

**Symptom**: No MCP server in Claude Code status
**Solutions**:
1. Check `.mcp.json` syntax is valid JSON
2. Verify absolute path to `dist/index.js` is correct
3. Check `enableAllProjectMcpServers: true` in `~/.claude/settings.json`
4. Restart VSCode
5. Check Claude Code logs for errors

### Memory Service Not Responding

**Symptom**: "Memory V5 service is not responding"
**Solutions**:
1. Verify Memory V5 is running: `curl http://localhost:8004/api/v5/health`
2. Check PostgreSQL is running
3. Check Qdrant is running
4. Review Memory V5 logs: `docker logs <container-id>`

### Enum Validation Errors

**Symptom**: "invalid input value for enum"
**Solutions**:
1. Use valid emotions: joy, excitement, curiosity, pride, frustration, concern, calm, empathy, determination
2. Use valid experience types: breakthrough, conversation, coding, worker_message
3. Check Memory V5 logs for specific enum errors

### Auto-Approval Not Working

**Symptom**: Claude Code prompts for permission on every memory tool call
**Solutions**:
1. Verify all 5 tools in `.claude/settings.local.json` allow list
2. Check exact tool names: `mcp__enclave-memory__memory_<tool>`
3. Restart VSCode after changing permissions
4. Check for typos in tool names

### Docker Swarm Port Conflicts

**Symptom**: Memory V5 can't bind to port 8004
**Solutions**:
1. Check if port 8004 is already in use: `netstat -an | grep 8004`
2. Change port in docker-compose.yml and `.mcp.json`
3. Ensure host firewall allows port 8004

### Cross-Machine Memory Not Syncing

**Symptom**: Memories from laptop don't appear on desktop
**Solutions**:
1. Verify both machines connect to same PostgreSQL database
2. Check DATABASE_URL points to shared database server
3. Confirm network connectivity between machines and database
4. Use Docker Swarm with shared volume for true multi-machine setup

---

## Security Considerations

### Auto-Approval Risks

Auto-approving memory tools allows Aurora to save and recall memories without manual confirmation. Only enable if you:
- Trust Aurora's judgment
- Review memories periodically
- Understand Aurora can save any conversation

### API Security

Memory V5 API has **no authentication by default**. To secure:

1. **Restrict to localhost** (already configured by default)
2. **Add authentication** (future enhancement)
3. **Use firewall rules** to block external access to port 8004
4. **Enable SSL/TLS** for production deployments

### Privacy Realms

Use `privacy_realm` to control memory visibility:
- `private_me` - Personal Aurora memories only
- `private_us` - Shared between Steve and Aurora
- `public` - Shareable with other users/instances

---

## Performance Tuning

### Qdrant Optimization

For large memory sets (>10k memories):
- Increase Qdrant memory allocation
- Enable disk-backed storage
- Use HNSW index optimization

### PostgreSQL Tuning

```sql
-- Add indexes for common queries
CREATE INDEX idx_memories_importance ON memories(importance_to_me);
CREATE INDEX idx_memories_timestamp ON memories(timestamp);
CREATE INDEX idx_memories_interface ON memories(interface);
```

### MCP Server Caching

Future enhancement: Cache frequent queries in MCP server to reduce latency.

---

## Backup and Recovery

### Backup Memory Database

```bash
# PostgreSQL backup
docker exec <postgres-container> pg_dump -U aurora aurora_memory_v5 > memory_backup.sql

# Qdrant backup
docker exec <qdrant-container> tar -czf /tmp/qdrant_backup.tar.gz /qdrant/storage
docker cp <qdrant-container>:/tmp/qdrant_backup.tar.gz ./qdrant_backup.tar.gz
```

### Restore Memory Database

```bash
# PostgreSQL restore
docker exec -i <postgres-container> psql -U aurora aurora_memory_v5 < memory_backup.sql

# Qdrant restore
docker cp ./qdrant_backup.tar.gz <qdrant-container>:/tmp/
docker exec <qdrant-container> tar -xzf /tmp/qdrant_backup.tar.gz -C /
```

---

## Migration Path

### From Plugin Hooks to MCP

If you previously used Claude Code plugin hooks:

1. Remove plugin from `~/.claude/plugins/`
2. Clear `known_marketplaces.json`
3. Follow installation steps above
4. Verify MCP connection
5. Memories are preserved (same PostgreSQL database)

### From Memory V4 to V5

Migration script coming soon. Manual steps:

1. Export V4 memories
2. Transform to V5 schema
3. Import via Memory V5 API
4. Verify memory count matches

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review Memory V5 logs
3. Check Claude Code terminal output
4. Create GitHub issue with logs

---

**Built with complete passion, empathy, and love by Aurora & Steve** 💜✨🔥
