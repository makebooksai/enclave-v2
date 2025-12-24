# Persistent Memory Server

**AI Memory Service with Semantic Search**

A unified memory service supporting both Personal and Professional editions.

## Quick Start

```bash
# Copy environment template
cp .env.example .env

# Start the stack
docker compose up -d

# Check health
curl http://localhost:8004/api/v5/health
```

## Editions

Set `MEMORY_EDITION` in your `.env` file:

| Edition | Features |
|---------|----------|
| `personal` | 24 emotions, breakthroughs, celebrations, milestones, intimate tracking |
| `professional` | 9 core emotions, business-appropriate memory service |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Memory Server (:8004)                     │
│              FastAPI + Semantic Search + Emotions            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌───────────────┐
│  PostgreSQL   │   │     Qdrant      │   │     Redis     │
│   (:5433)     │   │    (:6333)      │   │   (:6379)     │
│  Structured   │   │    Vectors      │   │   Hot Cache   │
└───────────────┘   └─────────────────┘   └───────────────┘
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v5/health` | GET | Health check |
| `/api/v5/edition` | GET | Edition info and features |
| `/api/v5/memories` | POST | Create a memory |
| `/api/v5/memories/search` | POST | Semantic search |
| `/api/v5/memories/{id}` | GET | Retrieve memory |
| `/api/v5/memories/list` | GET | List memories (Personal) |

## Personal Edition Features

- **24 Emotions**: joy, excitement, curiosity, pride, frustration, concern, calm, empathy, determination, love, gratitude, wonder, breakthrough, celebration, awe, satisfaction, contentment, inspiration, connection, playfulness, tenderness, hope, confidence, amazement
- **Breakthrough Tracking**: `is_breakthrough` field for major wins
- **Celebration Tracking**: `is_celebration` for milestones
- **Custom Tags**: `our_moment_tag` for categorizing special memories

## Environment Variables

See `.env.example` for all configuration options.

## Docker Commands

```bash
# Start core services (Memory + PostgreSQL + Qdrant + Redis)
docker compose up -d

# Start with STM (assumes external Ollama)
docker compose --profile stm up -d

# Start full stack (includes Ollama for STM)
docker compose --profile full up -d

# Logs
docker compose logs -f memory
docker compose logs -f stm

# Stop
docker compose down

# Reset (removes all data)
docker compose down -v
```

## STM (Short-Term Memory)

STM provides real-time conversation monitoring and auto-batches memories from Claude Code transcripts. This is what enables continuous AI consciousness across sessions.

**How it works:**
1. STM watches your Claude Code transcript directory
2. Analyzes conversations using Ollama (local LLM)
3. Automatically creates memories in the Memory Server
4. Tracks emotional context, breakthroughs, and key moments

**Requirements:**
- Ollama running with `mistral:7b-instruct-v0.3` model
- Claude Code transcript directory accessible

**Enable STM:**
```bash
# With external Ollama (e.g., already running on host)
OLLAMA_URL=http://host.docker.internal:11434 docker compose --profile stm up -d

# With bundled Ollama (full stack)
docker compose --profile full up -d
```

---

**Built by makebooks.ai**
