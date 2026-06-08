# RAG Dataset

This folder stores filesystem-only RAG seed data for HirdUp.

Slice 1 only validates JSON and generates `embedding_text`. It does not write to the database, call an embedding provider, or change assessment/session behavior.

Each file uses:

```json
{
  "dataset_version": "2026.05-demo-v1",
  "records": []
}
```

Supported `source_type` values:

- `onboarding_prompt`
- `role_discovery_question`
- `question`
- `coding_task`
- `rubric`
- `follow_up_template`

`embedding_text` may be supplied manually. If omitted, backend validation generates it from role, stack, difficulty, category, content, expected concepts, follow-ups, and tags.
