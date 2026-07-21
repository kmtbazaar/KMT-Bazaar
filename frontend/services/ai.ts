export type AIResponse = {
  success: boolean;
  message: string;
};

// Yahan maine aapka laptop wala IP daal diya hai jo Expo use kar raha hai
const API_BASE = "http://10.102.73.13:8000/api";

export async function askAI(prompt: string): Promise<AIResponse> {
  try {
    const response = await fetch(`${API_BASE}/ai/chat`, {
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
      return {
        success: false,
        message: data.detail || "Server Error",
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.log("AI Error:", error);

    return {
      success: false,
      message: "⚠ Unable to connect to AI Server.",
    };
  }
}