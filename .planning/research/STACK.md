# STACK.md — XLR8Hire Recommended 2026 AI Stack

> Status: Research Recommended for Demo-First Development

---

## 🚀 Recommended Stack

| Layer | Technology | Role |
|---|---|---|
| **Backend** | FastAPI | High-performance async Python framework. Perfect for AI/ML integration. |
| **Auth** | JWT (jose) | Stateless, lightweight identity for rapid demo stability. |
| **Database** | PostgreSQL + pgvector | Relational data + native vector storage for semantic talent matching. |
| **Orchestration** | LangChain / LangGraph | Managing complex multi-turn interview logic and evaluation chains. |
| **Real-time** | WebSockets | Low-latency bi-directional chat during the interview. |
| **Vector DB** | Pinecone (Serverless) | Alternative to pgvector if managed scaling/speed is preferred. |

## 💡 Rationale
- **FastAPI:** Its Pydantic integration matches your frontend TypeScript interfaces nearly 1:1, reducing "wiring" friction.
- **pgvector:** Keeping semantic data in the primary DB avoids the complexity of dual-database synchronization for a solo project.
- **JWT:** Minimal setup cost. No database lookups for session validation during high-frequency AI chat turns.

## ⚠️ What to Avoid
- **Legacy Auth (Session-based):** Too much state management for a rapid MVP.
- **Generic Chat Templates:** Avoid "LLM wrapper" patterns that don't handle interview-specific state (e.g., turn-taking, scoring triggers).
- **Client-side LLM calls:** Critical for demo security — NEVER expose your API keys in the Next.js bundle.

## 📈 Confidence Levels
- **FastAPI/Next.js Bridge:** 98% (Industry Standard)
- **JWT for Demo Auth:** 95% (Fastest Path)
- **pgvector for Search:** 90% (Simplest Architecture)
