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

function buildChatMessages(chatHistory = [], newUserMessage = null) {
  const messages = [{ role: "system", content: CHAT_SYSTEM_PROMPT }, ...chatHistory];
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

function extractChatReply(responseData) {
  return responseData?.choices?.[0]?.message?.content || null;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message: userMessage, messages: chatHistory = [] } = request.body;

    const apiPayload = {
      model: DEFAULT_MODEL,
      messages: buildChatMessages(chatHistory, userMessage),
    };

    const groqApiResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    });

    const responseText = await groqApiResponse.text();
    const responseData = responseText ? JSON.parse(responseText) : {};

    if (!groqApiResponse.ok) {
      const errorDetails = parseGroqApiError(responseText);
      const errorMessage = errorDetails.error?.message || errorDetails.message || "API request failed";
      console.error("Groq API error:", groqApiResponse.status, errorMessage);
      return response.status(500).json({ error: errorMessage });
    }

    const reply = extractChatReply(responseData);
    if (!reply) {
      console.error("Groq API returned no response content", responseData);
      return response.status(500).json({ error: "No response from AI" });
    }

    return response.status(200).json({ reply });
  } catch (error) {
    console.error("Chat endpoint error:", error);
    return response.status(500).json({ reply: "Something went wrong.", error: error.message });
  }
}
