import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemPrompt } from "./queryEndpoints";

let genAI: GoogleGenerativeAI | null = null;

export const generateChatResponse = async (
  message: string,
  spec: any,
  chatHistory: any[] = [],
  userApiKey?: string,
): Promise<{ text: string; tokensUsed: number }> => {
  const apiKey = userApiKey;
  if (!apiKey) {
    const err: any = new Error("Gemini API Key is required. Please provide it in the chat settings.");
    err.status = 401;
    throw err;
  }

  // We need to create a new instance if the API key is different or not yet initialized
  const generativeAI = new GoogleGenerativeAI(apiKey);

  const formattedHistory = chatHistory
    .map((msg) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}`)
    .join("\n");

  const systemPromptTxt = systemPrompt()
    .replace("{{INJECT_SPEC_HERE}}", JSON.stringify(spec, null, 2))
    .replace("{{INJECT_CHAT_HISTORY_HERE}}", formattedHistory || "No previous history.");

  const model = generativeAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPromptTxt,
  });

  try {
    const result = await model.generateContent(message);
    const response = await result.response;
    const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
    
    return {
      text: response.text(),
      tokensUsed,
    };
  } catch (error: any) {
    console.error("Error generating content with Gemini:", error);
    
    // Check for 429 Too Many Requests
    if (error?.status === 429 || error?.message?.includes("429") || error?.response?.status === 429) {
      const err: any = new Error("Rate limit exceeded (429). Please try again later or provide your own API key in Settings.");
      err.status = 429;
      throw err;
    }
    
    throw new Error("Failed to generate response from Gemini API.");
  }
};
