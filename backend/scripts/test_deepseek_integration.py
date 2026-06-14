import json
import sys
from pathlib import Path

# Add the backend root to sys.path so we can import 'app'
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

from app.core.config import get_settings
from app.services.deepseek_provider import DeepSeekProvider


def main() -> None:
    print("Loading project settings from .env...")
    settings = get_settings()

    api_key = settings.deepseek_api_key
    base_url = settings.deepseek_base_url
    model = settings.deepseek_model

    if not api_key:
        print("ERROR: DEEPSEEK_API_KEY is missing or empty in your .env file.")
        print("Please add it and try again.")
        sys.exit(1)

    print(f"Found DeepSeek API key (starts with {api_key[:5]}...)")
    print(f"Configured DeepSeek base URL: {base_url}")
    print(f"Configured DeepSeek model: {model}")

    print("\nInitializing DeepSeekProvider...")
    provider = DeepSeekProvider(
        api_key=api_key,
        base_url=base_url,
        model=model,
        reasoner_model=settings.deepseek_reasoner_model,
        timeout_seconds=20,
    )

    prompt = """
Return exactly one valid JSON object:
{
  "status": "success",
  "message": "DeepSeek API is fully operational"
}

No markdown. No prose. No code fences.
"""

    print("Sending test prompt to DeepSeek...")
    try:
        response_text = provider._chat_completion(
            model=model,
            prompt=prompt,
            max_tokens=200,
            system_prompt="You are a JSON-only API health-check assistant.",
            purpose="integration_test",
        )

        print("\nRaw response received:")
        print(response_text)

        parsed = json.loads(response_text)
        if parsed.get("status") == "success":
            print("\nTEST PASSED: DeepSeek API is working with your project configuration.")
            metadata = provider.state.metadata().model_dump()
            print(f"Provider: {metadata.get('actual_provider')}")
            print(f"Model: {metadata.get('model')}")
        else:
            print("\nWARNING: Response was valid JSON but did not contain the expected status.")
            sys.exit(1)
    except Exception as exc:
        print("\nTEST FAILED: DeepSeek request did not complete successfully.")
        print(str(exc))
        sys.exit(1)


if __name__ == "__main__":
    main()
