export const askAI = async (prompt: string) => {
  try {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

    if (!backendUrl) {
      throw new Error("Backend URL missing hai!");
    }

    const response = await fetch(`${backendUrl}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: prompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "AI request failed");
    }

    return {
      message: data.message,
    };

  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};