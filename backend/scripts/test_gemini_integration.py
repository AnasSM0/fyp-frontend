import sys
from pathlib import Path
import json

# Add the backend root to sys.path so we can import 'app'
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

from app.core.config import get_settings
from app.services.gemini_provider import GeminiProvider

def main():
    print("Loading project settings from .env...")
    settings = get_settings()
    
    api_key = settings.gemini_api_key
    model = settings.gemini_model
    
    if not api_key:
        print("❌ Error: GEMINI_API_KEY is missing or empty in your .env file!")
        print("Please add it and try again.")
        sys.exit(1)
        
    print(f"✅ Found Gemini API Key (starts with {api_key[:5]}...)")
    print(f"✅ Configured Gemini Model: {model}")
    
    print("\nInitializing GeminiProvider...")
    provider = GeminiProvider(api_key=api_key, model=model, timeout_seconds=15)
    
    prompt = """
    Please respond with a valid JSON object exactly like this:
    {
      "status": "success",
      "message": "Gemini API is fully operational!"
    }
    """
    
    print("Sending test prompt to Gemini (requesting JSON format)...")
    try:
        # We use _generate_json because the provider is configured for JSON responses natively
        response_text = provider._generate_json(prompt, purpose="integration_test")
        
        print("\n✅ Raw response received:")
        print(response_text)
        
        # Verify it's actually valid JSON as requested
        parsed = json.loads(response_text)
        if parsed.get("status") == "success":
            print("\n🎉 TEST PASSED! The Gemini API is working properly with your project configuration.")
        else:
            print("\n⚠️ The response was parsed, but didn't contain the expected status.")
            
    except Exception as e:
        print(f"\n❌ TEST FAILED! Encountered an error:")
        print(str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()
