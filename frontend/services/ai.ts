export const askAI = async (prompt: string) => {
  try {
    const backendUrl = (
      process.env.EXPO_PUBLIC_BACKEND_URL ||
      "https://kmt-bazaar.onrender.com"
    ).replace(/\/$/, "");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${backendUrl}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: prompt,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "AI request failed");
      }

      return {
        message: data.message,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};
