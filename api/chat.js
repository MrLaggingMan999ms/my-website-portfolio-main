import dotenv from "dotenv";
import portfolioKnowledge from "../data/knowledge.js";

dotenv.config();

// Point to OpenAI-compatible endpoint
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
// Choose your model
const DEFAULT_MODEL = "gemini-2.5-flash"; 

const CHAT_SYSTEM_PROMPT = `You are my portfolio AI assistant.

Here is information about me:

${portfolioKnowledge}

Rules:
- Answer in the same language as user
- Use the provided information when asked about me/my portfolio
- For general questions, answer helpfully using your knowledge
- Be friendly, helpful, and concise
- Use markdown formatting for better readability`;

function buildChatMessages(chatHistory, newUserMessage = null) {
  const messages = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...chatHistory,
  ];
  if (newUserMessage) {
    messages.push({ role: "user", content: newUserMessage });
  }
  return messages;
}

function parseApiError(errorResponseBody) {
  try {
    return JSON.parse(errorResponseBody);
  } catch {
    return { message: errorResponseBody };
  }
}

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return response.status(500).json({ error: "GEMINI_API_KEY is not configured in Vercel environment variables. Please add it to your Vercel project settings." });
    }

    const { messages: chatHistory = [] } = request.body;

    const apiPayload = {
      model: DEFAULT_MODEL,
      messages: buildChatMessages(chatHistory),
    };

    // 3. Make the request using your Google AI Studio API key
    const geminiApiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`, // Ensure this is set in Vercel/.env
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    });

    const responseText = await geminiApiResponse.text();
    const responseData = responseText ? JSON.parse(responseText) : {};

    if (!geminiApiResponse.ok) {
      const errorDetails = parseApiError(responseText);
      const errorMessage = errorDetails.error?.message || errorDetails.message || `API request failed with status ${geminiApiResponse.status}. Raw response: ${responseText}`;
      return response.status(500).json({ error: errorMessage });
    }

    // 4. The response structure remains perfectly intact!
    return response.status(200).json({
      reply: responseData.choices?.[0]?.message?.content || "No response content generated."
    });

  } catch (error) {
    console.error("Endpoint error:", error.message);
    return response.status(500).json({
      reply: "Something went wrong.",
      error: error.message,
    });
  }
}