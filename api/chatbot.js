import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import portfolioKnowledge from "../data/knowledge.js";

dotenv.config();

const SERVER_PORT = 5000;
const app = express();

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

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

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

function extractContentFromStreamChunk(parsedChunk) {
  return parsedChunk.choices?.[0]?.delta?.content || "";
}

app.post("/chat/stream", async (request, response) => {
  try {
    const { messages: chatHistory } = request.body;

    const apiPayload = {
      model: DEFAULT_MODEL,
      stream: true,
      messages: buildChatMessages(chatHistory),
    };

    const groqApiResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        // eslint-disable-next-line no-undef
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    });

    if (!groqApiResponse.ok) {
      const errorResponseBody = await groqApiResponse.text();
      console.error("Groq API error status:", groqApiResponse.status);
      console.error("Groq API error body:", errorResponseBody);

      const errorDetails = parseGroqApiError(errorResponseBody);
      const errorMessage = errorDetails.error?.message || errorDetails.message || "API request failed";
      response.status(500).json({ error: errorMessage });
      return;
    }

    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");

    const streamReader = groqApiResponse.body.getReader();

    while (true) {
      const { done: isStreamDone, value: streamChunk } = await streamReader.read();
      if (isStreamDone) break;

      const decodedChunk = new TextDecoder().decode(streamChunk);
      const chunkLines = decodedChunk.split("\n");

      for (const line of chunkLines) {
        if (!line.startsWith("data: ")) continue;

        const streamData = line.slice(6);
        if (streamData === "[DONE]") {
          response.write("data: [DONE]\n\n");
          continue;
        }

        try {
          const parsedChunk = JSON.parse(streamData);
          const contentPiece = extractContentFromStreamChunk(parsedChunk);
          if (contentPiece) {
            response.write(`data: ${JSON.stringify({ content: contentPiece })}\n\n`);
          }
        } catch (parseError) {
          console.log("Failed to parse streaming chunk:", parseError.message);
        }
      }
    }

    response.end();
  } catch (error) {
    console.error("Streaming endpoint error:", error.message);
    console.error(error.stack);
    const errorMessage = error.message || "Something went wrong";

    if (!response.headersSent) {
      response.status(500).json({ error: errorMessage });
    } else {
      response.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      response.end();
    }
  }
});

app.post("/chat", async (request, response) => {
  try {
    const { message: userMessage, messages: chatHistory = [] } = request.body;

    const apiPayload = {
      model: DEFAULT_MODEL,
      messages: buildChatMessages(chatHistory, userMessage),
    };

    const groqApiResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        // eslint-disable-next-line no-undef
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    });

    const responseData = await groqApiResponse.json();

    response.json({
      reply: responseData.choices[0].message.content,
    });
  } catch (error) {
    console.error("Chat endpoint error:", error.message);
    console.error(error.stack);
    response.status(500).json({
      reply: "Something went wrong.",
      error: error.message,
    });
  }
});

// app.listen(SERVER_PORT, () => {
//   console.log(`Server running on port ${SERVER_PORT}`);
// });