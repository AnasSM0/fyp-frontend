# ARCHITECTURE.md — Modular API-Ready Bridge

> Status: Research Recommended for Solo Developer Efficiency

---

## 🏗️ Component Boundaries
- **Service Layer (`src/api/`)**: Centralized Axios/Fetch instances. Typed request/response interfaces for every FastAPI endpoint.
- **State Layer (`src/store/`)**: Zustand stores for:
    - `useAuthStore`: Token storage + user role.
    - `useInterviewStore`: Real-time chat history + active question state.
    - `useAssessmentStore`: Setup parameters and evaluation results.
- **UI Layer (`src/components/`)**: Modularized Interview components (Chat, CodeEditor, Timer, Console) to allow independent testing/wiring.

## 🔄 Data Flow
1. **Onboarding**: Profile Data → POST `/api/v1/candidates/profile`.
2. **Setup**: Profile → GET `/api/v1/assessment/blueprint` → Frontend stores blueprint.
3. **Interview**: 
    - WebSocket connection: `ws://backend/assessment/session/{id}`.
    - Local state: Appends messages optimistically.
4. **Results**: POST `/api/v1/assessment/submit` → GET `/api/v1/assessment/report`.

## 📅 Suggested Build Order (Vertical MVP)
1. **Core Bridge**: Set up `api/client.ts` and Basic JWT Login logic.
2. **Interview Loop**: Connect Interview UI to a mock WebSocket → Connect to real FastAPI.
3. **Results Generator**: Wire Evaluation UI to report data from backend.
4. **Onboarding/Search**: Connect profile creation and recruiter search endpoints.
