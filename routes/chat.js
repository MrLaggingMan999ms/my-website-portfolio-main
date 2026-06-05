import { Router } from "express";
import dotenv from "dotenv";
import portfolioKnowledge from "../data/knowledge.js";

dotenv.config();

const router = Router();

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
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

function parseGeminiApiError(errorResponseBody) {
  try {
    return JSON.parse(errorResponseBody);
  } catch {
    return { message: errorResponseBody };
  }
}

router.post("/", async (request, response, next) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return response.status(500).json({ error: "GEMINI_API_KEY is not defined in the environment variables." });
    }

    const { messages: chatHistory = [] } = request.body;

    const MODELS = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.5-flash-lite"];
    let lastError = null;
    let responseData = null;
    let success = false;

    for (const model of MODELS) {
      try {
        console.log(`Attempting chat completion with model: ${model}`);
        const apiPayload = {
          model: model,
          messages: buildChatMessages(chatHistory),
        };

        const geminiApiResponse = await fetch(GEMINI_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiPayload),
        });

        const responseText = await geminiApiResponse.text();
        const parsedData = responseText ? JSON.parse(responseText) : {};

        if (geminiApiResponse.ok) {
          responseData = parsedData;
          success = true;
          break;
        } else {
          const errorDetails = parseGeminiApiError(responseText);
          const errorMessage = errorDetails.error?.message || errorDetails.message || `API request failed with status ${geminiApiResponse.status}. Raw response: ${responseText}`;
          lastError = new Error(`Model ${model} failed: ${errorMessage}`);
          console.warn(`Model ${model} failed. Trying fallback... Error: ${errorMessage}`);
        }
      } catch (err) {
        lastError = err;
        console.warn(`Request failed for model ${model}: ${err.message}. Trying fallback...`);
      }
    }

    if (!success) {
      return response.status(500).json({ error: lastError?.message || "All models failed to respond." });
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
});

export default router;

