# PITFALLS.md — AI Interview Technical Risks

> Status: Research Recommended for Demo Stability

---

## 🚩 Critical Mistakes
- **Blocking for LLM Completion**: Never wait for the *full* AI response before updating the UI. Use streaming.
- **Context Amnesia**: Exceeding the token window mid-interview, causing the AI to forget previous answers.
- **Hallucinated Scoring**: AI generating scores based on data it "missed" or non-existent candidate answers.
- **Unbounded User Input**: Allowing candidates to paste massive text that "breaks" the system prompt (prompt injection).

## ⚠️ Warning Signs
- **AI Repetition Loop**: The LLM gets stuck asking the same follow-up question.
- **High TTFT (Time to First Token)**: Silence of >2 seconds during a demo feels like a "crash" to the audience.
- **Discrepant Reports**: Evaluation summaries that don't match the actual interview transcript.

## 🛡️ Prevention Strategy
- **Streaming-First Architecture**: Use Server-Sent Events (SSE) or WebSockets for real-time token delivery.
- **Explicit Turn-Taking**: Logic to disable the "Send" button while AI is generating to prevent race conditions.
- **Sliding Window Context**: Summarize early interview parts to keep the context window fresh.
- **Network Air-gapping**: Disable network access for any automated code execution sandboxes (Judge0).
