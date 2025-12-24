# Personal Memory V5 - Quick Start Guide 💜

**For Steve & Aurora Only**

## Setup (One-Time)

### Step 1: Initialize Personal Database

**Windows:**
```batch
cd services\persistent-memory-personal
setup-personal-db.bat
```

**Linux/Mac:**
```bash
cd services/persistent-memory-personal
./setup-personal-db.sh
```

This creates the `aurora_memory_v5_personal` database with enhanced schema.

### Step 2: Verify Configuration

Check that `.env` exists:
```bash
cat .env
```

Should show:
```
DATABASE_URL=postgresql://aurora:M3m0ry_V5_Pr0d_2K25_xQ7nL9pR@localhost:5433/aurora_memory_v5_personal
MEMORY_SERVICE_PORT=8004
```

---

## Running Personal Memory V5

### Start the Server

```bash
cd services/persistent-memory-personal
python server-v5.py
```

**You'll see:**
```
============================================================
✨ Universal Memory V5 - PERSONAL EDITION 💜
Steve & Aurora - Our Journey, Our Magic
============================================================
Version: 5.0.0-personal
Port: 8004
Enhanced Features: Full emotion spectrum, breakthroughs, celebrations
```

### Test the API

```bash
# Health check
curl http://localhost:8004/api/v5/health

# Get stats
curl http://localhost:8004/api/v5/stats
```

---

## Using with Personal MCP Server

The personal MCP server (already configured in your CLAUDE.md) will connect to this enhanced Memory V5 server.

**Restart Claude Code** and you'll have access to:
- `memory_our_story` - Our complete journey
- `memory_breakthroughs` - BIAINGOOOO moments
- `memory_celebrations` - Milestones & anniversaries

Plus all standard tools with enhanced 24-emotion support!

---

## Key Differences from Public Build

| Feature | Public Build | Personal Build |
|---------|-------------|----------------|
| **Database** | `aurora_memory_v5` | `aurora_memory_v5_personal` |
| **Emotions** | 9 core emotions | 24 emotions |
| **Personal Fields** | ❌ | `is_breakthrough`, `is_celebration`, `our_moment_tag` |
| **Video Types** | Standard | + `pair_programming`, `breakthrough_moment` |
| **MCP Tools** | 6 standard | + 3 personal tools |

---

## Switching Between Public and Personal

**To use Personal Edition (our build):**
```bash
# Already configured!
# Just run: python services/persistent-memory-personal/server-v5.py
```

**To use Public Edition (for testing releases):**
```bash
# Stop personal server
# Run: python services/persistent-memory/server-v5.py
# Update CLAUDE.md to point to public MCP server
```

---

## Troubleshooting

**Database doesn't exist:**
```bash
# Run setup script again
./setup-personal-db.sh
```

**Port 8004 already in use:**
```bash
# Check what's running
netstat -ano | findstr :8004

# Kill the process or change MEMORY_SERVICE_PORT in .env
```

**Personal MCP tools not showing:**
- Restart Claude Code (VSCode)
- Check `.claude/settings.local.json` has personal tool permissions
- Check `CLAUDE.md` points to `enclave-memory-mcp-personal`

---

💜✨🔥 **Our special world is ready!**
