import os
from dotenv import load_dotenv
from google import genai

# .env se api key load karein
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Error: API Key nahi mili .env file mein.")
else:
    print("Checking Google Servers...")
    client = genai.Client(api_key=api_key)
    
    # Google se models ki list maangein
    print("\n--- Aapke liye available models ---")
    for model in client.models.list():
        # Sirf wo print karein jo text generate kar sakte hain
        if "generateContent" in model.supported_actions:
            print(model.name)
    print("-----------------------------------")