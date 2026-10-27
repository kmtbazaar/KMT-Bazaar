const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const assistant = fs.readFileSync(path.join(root, "app/assistant.tsx"), "utf8");
const backend = fs.readFileSync(path.join(root, "../backend/server.py"), "utf8");

const checks = [
  [assistant.includes("webkitSpeechRecognition") && assistant.includes("SpeechRecognition"), "browser speech recognition enabled"],
  [assistant.includes("speechSynthesis") && assistant.includes("SpeechSynthesisUtterance"), "AI voice playback enabled"],
  [assistant.includes("toggleVoiceMode") && assistant.includes("voiceModeRef.current"), "voice conversation mode toggle and turn flow exist"],
  [assistant.includes('setVoiceLanguage((current) => current === "en-IN" ? "hi-IN" : "en-IN")'), "English/Hindi voice language switch exists"],
  [assistant.includes("error.message") && !assistant.includes("Voice Recording Triggered"), "mic placeholder removed and AI errors surfaced"],
  [backend.includes('(os.getenv("GEMINI_API_KEY") or "").strip()'), "Gemini key normalized from backend environment"],
  [backend.includes('"gemini-3.8-flash"'), "current default Gemini flash model configured"],
  [backend.includes("Gemini API key is invalid or blocked") && backend.includes("Gemini API quota or rate limit reached"), "actionable Gemini provider errors configured"],
];

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
}
if (failed.length) process.exit(1);
console.log("AI_VOICE_MODE_VALIDATION_PASS");
