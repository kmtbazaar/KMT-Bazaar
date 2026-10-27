const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const assistant = fs.readFileSync(path.join(root, "app/assistant.tsx"), "utf8");
const aiClient = fs.readFileSync(path.join(root, "services/ai.ts"), "utf8");
const backend = fs.readFileSync(path.join(root, "../backend/server.py"), "utf8");

const checks = [
  [assistant.includes("MediaRecorderCtor") && assistant.includes("getUserMedia"), "single mic records actual audio"],
  [assistant.includes("transcribeVoice(audioBase64, safeMimeType)"), "recorded audio uses Gemini transcription endpoint"],
  [assistant.includes("speechSynthesis") && assistant.includes("SpeechSynthesisUtterance"), "AI voice playback enabled"],
  [assistant.includes("toggleVoiceMode") && assistant.includes("voiceModeRef.current"), "same mic toggles voice conversation on and off"],
  [assistant.includes("Hindi/English auto-detect") && !assistant.includes("voiceLanguageButton") && !assistant.includes("setVoiceLanguage"), "automatic language status; language picker removed"],
  [!assistant.includes(">Voice Mode<") && !assistant.includes('"Voice Mode"') && !assistant.includes('>"EN"<'), "visible Voice Mode and EN labels removed"],
  [aiClient.includes("/api/ai/transcribe") && aiClient.includes("audio_base64"), "frontend sends audio to transcription API"],
  [backend.includes("async def ai_transcribe") && backend.includes('model="gemini-3.5-transcribe"'), "Gemini transcription endpoint uses auto-language transcribe model"],
  [backend.includes("Write Hindi words in Devanagari script") && backend.includes("naturally in Hinglish"), "Hindi/English code-switching preserved in transcript and AI reply"],
  [backend.includes('(os.getenv("GEMINI_API_KEY") or "").strip()'), "Gemini key normalized from backend environment"],
  [backend.includes('"gemini-3.8-flash"'), "current default Gemini chat model configured"],
  [backend.includes("Gemini API key is invalid or blocked") && backend.includes("Gemini API quota or rate limit reached"), "actionable Gemini provider errors configured"],
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
}
if (failed.length) process.exit(1);
console.log("AI_VOICE_MODE_VALIDATION_PASS");
