from __future__ import annotations

import hashlib
import json
import math
import re
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Protocol

from app.core.config import get_settings
from app.schemas.semantic import EmbeddingProviderMetadata
from app.services.ai_call_audit import classify_ai_failure, end_ai_call, log_live_embedding_blocked, start_ai_call


TOKEN_RE = re.compile(r"[a-zA-Z0-9+#.]+")


@dataclass
class EmbeddingResult:
    vector: list[float]
    provider: str
    model: str
    dimensions: int
    fallback_used: bool
    warnings: list[str] = field(default_factory=list)

    def metadata(self) -> EmbeddingProviderMetadata:
        return EmbeddingProviderMetadata(
            provider=self.provider,
            model=self.model,
            dimensions=self.dimensions,
            fallback_used=self.fallback_used,
            warnings=self.warnings,
        )


class EmbeddingProvider(Protocol):
    provider: str
    model: str

    def embed_text(self, text: str) -> EmbeddingResult:
        ...

    def explain_match(self, payload: dict) -> str:
        ...


class EmbeddingProviderError(RuntimeError):
    pass


def normalize_vector(values: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in values))
    if norm == 0:
        values = [1.0] + [0.0 for _ in values[1:]]
        norm = 1.0
    return [round(value / norm, 8) for value in values]


class StubEmbeddingProvider:
    provider = "stub"

    def __init__(self, dimensions: int = 64, warning: str | None = None):
        self.dimensions = dimensions
        self.model = f"deterministic-hash-{dimensions}"
        self.warning = warning or "Deterministic stub embeddings used."

    def embed_text(self, text: str) -> EmbeddingResult:
        vector = [0.0 for _ in range(self.dimensions)]
        tokens = TOKEN_RE.findall(text.lower())
        if not tokens:
            tokens = ["empty"]
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimensions
            sign = 1 if digest[4] % 2 == 0 else -1
            weight = 1 + (len(token) % 5)
            vector[index] += sign * weight
        vector = normalize_vector(vector)
        return EmbeddingResult(
            vector=vector,
            provider=self.provider,
            model=self.model,
            dimensions=self.dimensions,
            fallback_used=True,
            warnings=[self.warning],
        )

    def explain_match(self, payload: dict) -> str:
        matched = ", ".join(payload.get("matched_skills") or ["profile evidence"])
        missing = ", ".join(payload.get("missing_skills") or ["no major required skills flagged"])
        integrity = payload.get("integrity_risk_level", "clean")
        return (
            f"Matched because candidate evidence aligns with {matched}. "
            f"Verified score is {payload.get('verified_score')}/100 and role fit is "
            f"{payload.get('role_fit')}/100. Missing or weaker signals: {missing}. "
            f"Integrity risk is {integrity}. Strongest fit: {payload.get('target_role') or 'target role'}."
        )


class GeminiEmbeddingProvider:
    provider = "gemini"

    def __init__(self, api_key: str, model: str, timeout_seconds: int = 30):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    def _request(self, action: str, payload: dict, *, purpose: str) -> dict:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:{action}"
        )
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": self.api_key},
            method="POST",
        )
        payload_chars = len(json.dumps(payload, ensure_ascii=True))
        record, started_perf = start_ai_call(
            purpose=purpose,
            provider="gemini",
            model=self.model,
            endpoint_path=f"/v1beta/models/{self.model}:{action}",
            prompt_char_count=payload_chars,
            estimated_payload_size_chars=payload_chars,
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
                end_ai_call(record, started_perf, success=True, status_code=getattr(response, "status", 200))
                return body
        except urllib.error.HTTPError as exc:
            end_ai_call(
                record,
                started_perf,
                success=False,
                status_code=exc.code,
                failure_reason=classify_ai_failure(exc, exc.code),
            )
            raise EmbeddingProviderError("Gemini embedding request failed") from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            end_ai_call(record, started_perf, success=False, failure_reason=classify_ai_failure(exc))
            raise EmbeddingProviderError("Gemini embedding request failed") from exc

    def embed_text(self, text: str) -> EmbeddingResult:
        payload = {
            "model": f"models/{self.model}",
            "content": {"parts": [{"text": text}]},
        }
        body = self._request("embedContent", payload, purpose="embedding")
        try:
            vector = [float(value) for value in body["embedding"]["values"]]
        except (KeyError, TypeError, ValueError) as exc:
            raise EmbeddingProviderError("Gemini embedding response missing values") from exc
        return EmbeddingResult(
            vector=normalize_vector(vector),
            provider=self.provider,
            model=self.model,
            dimensions=len(vector),
            fallback_used=False,
            warnings=[],
        )

    def explain_match(self, payload: dict) -> str:
        prompt = f"""
Explain this HirdUp recruiter match in 2 concise sentences.
Mention aligned skills, missing skills, verified score, integrity risk, and strongest role.
Return plain text only.

Payload:
{json.dumps(payload, ensure_ascii=True)}
"""
        request_payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2},
        }
        body = self._request("generateContent", request_payload, purpose="matching")
        try:
            return body["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise EmbeddingProviderError("Gemini match explanation missing text") from exc


class FallbackEmbeddingProvider:
    def __init__(self, primary: EmbeddingProvider | None, stub_dimensions: int):
        self.primary = primary
        self.stub = StubEmbeddingProvider(dimensions=stub_dimensions)

    def embed_text(self, text: str) -> EmbeddingResult:
        if self.primary is None:
            return self.stub.embed_text(text)
        try:
            return self.primary.embed_text(text)
        except Exception as exc:
            fallback = StubEmbeddingProvider(
                dimensions=self.stub.dimensions,
                warning=f"Gemini embedding failed; deterministic stub used. {exc}",
            )
            return fallback.embed_text(text)

    def explain_match(self, payload: dict) -> tuple[str, bool, list[str]]:
        if self.primary is None:
            return self.stub.explain_match(payload), True, [self.stub.warning]
        try:
            return self.primary.explain_match(payload), False, []
        except Exception as exc:
            fallback = StubEmbeddingProvider(
                dimensions=self.stub.dimensions,
                warning=f"Gemini match explanation failed; deterministic stub used. {exc}",
            )
            return fallback.explain_match(payload), True, [fallback.warning]


def build_embedding_provider() -> FallbackEmbeddingProvider:
    settings = get_settings()
    provider_name = getattr(settings, "embedding_provider", "stub").strip().lower()
    live_enabled = bool(getattr(settings, "enable_live_embedding_calls", False))
    primary = None
    if provider_name == "gemini" and settings.gemini_api_key and live_enabled:
        primary = GeminiEmbeddingProvider(
            api_key=settings.gemini_api_key,
            model=settings.gemini_embedding_model,
        )
    elif provider_name == "gemini" and settings.gemini_api_key and not live_enabled:
        log_live_embedding_blocked(
            provider="gemini",
            model=settings.gemini_embedding_model,
            purpose="embedding",
            caller="build_embedding_provider",
        )
    return FallbackEmbeddingProvider(primary, settings.stub_embedding_dimensions)
