import json
import sys
from types import SimpleNamespace

from app.services.nvidia_provider import NVIDIAProvider


ANSWER_JSON = json.dumps(
    {
        "technical_accuracy": 82,
        "problem_solving": 80,
        "communication_clarity": 78,
        "reasoning_depth": 81,
        "code_quality": 76,
        "expected_concepts_covered": ["API contract"],
        "missing_concepts": ["edge cases"],
        "confidence": 86,
        "short_feedback": "Evidence-based evaluation.",
        "transcript_evidence": ["candidate explained API contract"],
    }
)


def test_nvidia_retries_transient_http_errors(monkeypatch):
    sleep_delays: list[float] = []

    class TransientError(Exception):
        status_code = 503

    class FakeCompletions:
        def __init__(self):
            self.call_count = 0

        def create(self, **_kwargs):
            self.call_count += 1
            if self.call_count <= 2:
                raise TransientError("temporary provider outage")
            return SimpleNamespace(
                choices=[
                    SimpleNamespace(
                        message=SimpleNamespace(content=ANSWER_JSON),
                    )
                ]
            )

    completions = FakeCompletions()

    class FakeOpenAI:
        def __init__(self, **_kwargs):
            self.chat = SimpleNamespace(completions=completions)

    monkeypatch.setitem(sys.modules, "openai", SimpleNamespace(OpenAI=FakeOpenAI))
    monkeypatch.setattr("time.sleep", lambda delay: sleep_delays.append(delay))

    provider = NVIDIAProvider(
        api_key="test-nvidia-key",
        model="nvidia-test-model",
        base_url="https://nvidia.test/v1",
        timeout_seconds=1,
    )

    result = provider._generate_json("Return JSON.", enable_thinking=False)

    assert json.loads(result)["technical_accuracy"] == 82
    assert completions.call_count == 3
    assert sleep_delays == [2.0, 4.0]
