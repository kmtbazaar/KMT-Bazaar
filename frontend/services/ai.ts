// services/ai.js ya services/ai.ts ke andar ka pura code isse replace kar dein:

export const askAI = async (prompt) => {
  try {
    // Vercel aur Expo ke liye API key yahan se aayegi
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("API Key missing hai!");
    }

    // Direct Gemini API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Gemini Error:", data.error.message);
      throw new Error(data.error.message);
    }

    // AI ka response
    return {
      message: data.candidates[0].content.parts[0].text,
    };
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error; 
  }
};

