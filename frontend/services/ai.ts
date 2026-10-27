export const askAI = async (prompt: string) => {
  const configuredBase = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  const isWeb = typeof window !== "undefined";
  const backendUrl = configuredBase
    ? configuredBase.replace(/\/$/, "")
    : isWeb
      ? window.location.origin
      : "https://kmtbazaar.com";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(
      `${backendUrl}/api/ai/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
        signal: controller.signal,
      },
    );

    const raw = await response.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }

    if (!response.ok) {
      throw new Error(
        data?.detail || data?.message || `AI service returned HTTP ${response.status}`,
      );
    }
    if (!data?.message) throw new Error("AI service returned an empty response");
    return { message: data.message };
  } catch (error: any) {
    console.error("AI Service Error:", error);
    if (error?.name === "AbortError") {
      throw new Error("AI request timed out. Please try again.");
    }
    throw error instanceof Error ? error : new Error("Unable to reach AI service");
  } finally {
    clearTimeout(timeoutId);
  }
};


export const transcribeVoice = async (audioBase64: string, mimeType: string) => {
  const configuredBase = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  const isWeb = typeof window !== "undefined";
  const backendUrl = configuredBase
    ? configuredBase.replace(/\/$/, "")
    : isWeb
      ? window.location.origin
      : "https://kmtbazaar.com";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch(`${backendUrl}/api/ai/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_base64: audioBase64, mime_type: mimeType }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }

    if (!response.ok) {
      throw new Error(
        data?.detail || data?.message || `Voice transcription failed with HTTP ${response.status}`,
      );
    }
    if (!data?.transcript) throw new Error("No speech detected. Please try again.");
    return { transcript: String(data.transcript).trim() };
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Voice transcription timed out. Please try again.");
    }
    throw error instanceof Error ? error : new Error("Unable to transcribe voice");
  } finally {
    clearTimeout(timeoutId);
  }
};
