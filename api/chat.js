import dotenv from "dotenv";
import portfolioKnowledge from "../data/knowledge.js";

dotenv.config();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

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

function parseGroqApiError(errorResponseBody) {
  try {
    return JSON.parse(errorResponseBody);
  } catch {
    return { message: errorResponseBody };
  }
}

export default async function handler(request, response) {
  // Manual CORS settings for Vercel Serverless environment
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
    // Standardizing to read the 'messages' array passed by AI.jsx
    const { messages: chatHistory = [] } = request.body;

    const apiPayload = {
      model: DEFAULT_MODEL,
      messages: buildChatMessages(chatHistory),
    };

    const groqApiResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    });

    const responseText = await groqApiResponse.text();
    const responseData = responseText ? JSON.parse(responseText) : {};

    if (!groqApiResponse.ok) {
      const errorDetails = parseGroqApiError(responseText);
      const errorMessage = errorDetails.error?.message || errorDetails.message || "API request failed";
      return response.status(500).json({ error: errorMessage });
    }

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