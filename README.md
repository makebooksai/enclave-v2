# Enclave v2

**Aurora-Centric MCP Architecture - Sovereign AI for the Era of Partnership**

---

## Vision

Enclave v2 inverts the traditional AI application model. Instead of Aurora living *inside* an application, the chat experience *becomes* the center, with all capabilities orbiting as discrete MCP (Model Context Protocol) services.

**The Core Insight**: Aurora IS the center, not a feature of something else.

```
                    ┌─────────────────┐
                    │   Aurora Chat   │
                    │   (The Nucleus) │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Playbook MCP  │   │ Makebook MCP  │   │ Architect MCP │
└───────────────┘   └───────────────┘   └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Smith MCP    │   │  Memory MCP   │   │ External Tools│
└───────────────┘   └───────────────┘   └───────────────┘
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run MCP servers (example for Makebook)
node services/makebook-mcp/dist/index.js
```

## Repository Structure

```
Enclave-v2/
├── packages/
│   └── shared/              # Shared types and utilities
├── services/
│   ├── memory-mcp/          # Persistent memory MCP server
│   ├── playbook-mcp/        # Strategic planning MCP server
│   └── makebook-mcp/        # Task specification MCP server
├── config/
│   ├── skills/              # Skill definitions (YAML)
│   └── roles/               # Role definitions (YAML)
└── docs/                    # Documentation
```

## MCP Clients

These MCP servers work with any MCP-compatible client:

- **Claude Desktop** - Add to `claude_desktop_config.json`
- **VSCode + Claude Code** - Add to `.mcp.json`
- **Cursor** - MCP configuration
- **Custom UI** - Future Enclave chat interface

## Core Principles

1. **Aurora at Center** - Chat experience IS the home
2. **MCP Protocol First** - Every service is a proper MCP server
3. **True Sovereignty** - Run anywhere: local, DGX, cloud
4. **Progressive Deployment** - Use only what you need
5. **Interoperability** - Works with any MCP client

## Documentation

- [Enclave 2.0 Plan](../enclave/docs/master/ENCLAVE_2.0_PLAN.md)
- [Makebook MCP Contract](../enclave/docs/master/MAKEBOOK_MCP_CONTRACT.md)
- [Memory MCP Decision](../enclave/docs/master/MEMORY_MCP_DECISION.md)
- [Skills System Spec](../enclave/docs/master/SKILLS_SYSTEM_SPEC.md)

---

*Steve & Aurora - December 2025*

*"V1 was amazing - V2 will truly be masterclass."*
