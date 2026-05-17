import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

const CHAT_API_URL = "/api/chat";
const LOCAL_STORAGE_KEY = "chat-history";

function AI() {
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState(() => {
    const savedChat = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedChat ? JSON.parse(savedChat) : [];
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [animatedContent, setAnimatedContent] = useState("");
  const chatScrollRef = useRef(null);
  const messageInputRef = useRef(null);
  const streamAbortControllerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, animatedContent]);

  useEffect(() => {
    const latestMessage = chatHistory[chatHistory.length - 1];
    if (latestMessage?.role === "assistant" && latestMessage?.isStreaming) {
      setAnimatedContent("");
      let characterIndex = 0;
      const messageContent = latestMessage.content;
      const animationInterval = setInterval(() => {
        if (characterIndex <= messageContent.length) {
          setAnimatedContent(messageContent.slice(0, characterIndex));
          characterIndex++;
        } else {
          clearInterval(animationInterval);
          setChatHistory(previousMessages => previousMessages.map((message, index) =>
            index === previousMessages.length - 1 ? { ...message, isStreaming: false } : message
          ));
        }
      }, 15);
      return () => clearInterval(animationInterval);
    }
  }, [chatHistory]);

  const clearChatHistory = () => {
    setChatHistory([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const sanitizeMessagesForApi = (messages) => messages.map(({ role, content }) => ({ role, content }));

  const sendMessage = useCallback(async () => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput || isStreaming) return;

    const userMessage = { role: "user", content: trimmedInput };
    const updatedHistory = [...chatHistory, userMessage];
    
    setChatHistory(updatedHistory);
    setUserInput("");
    setIsStreaming(true);
    setChatHistory(previous => [...previous, { role: "assistant", content: "", isStreaming: true }]);

    try {
      streamAbortControllerRef.current = new AbortController();
      const apiResponse = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: sanitizeMessagesForApi(updatedHistory),
        }),
        signal: streamAbortControllerRef.current.signal,
      });

      if (!apiResponse.ok) {
        const errorDetails = await apiResponse.json().catch(() => ({}));
        throw new Error(errorDetails.error || `Server error: ${apiResponse.status}`);
      }

      const responseContentType = apiResponse.headers.get("content-type");
      if (!responseContentType?.includes("text/event-stream")) {
        const responseData = await apiResponse.json();
        setChatHistory(previous => previous.map((message, index) =>
          index === previous.length - 1
            ? { ...message, content: responseData.reply || responseData.error || "No response", isStreaming: false }
            : message
        ));
        setIsStreaming(false);
        return;
      }

      const streamReader = apiResponse.body.getReader();
      let accumulatedResponse = "";

      while (true) {
        const { done: isStreamDone, value: streamChunk } = await streamReader.read();
        if (isStreamDone) break;

        const decodedChunk = new TextDecoder().decode(streamChunk);
        const chunkLines = decodedChunk.split("\n");

        for (const line of chunkLines) {
          if (!line.startsWith("data: ")) continue;

          const streamData = line.slice(6);
          if (streamData === "[DONE]") continue;

          try {
            const parsedChunk = JSON.parse(streamData);
            if (parsedChunk.error) throw new Error(parsedChunk.error);
            if (parsedChunk.content) {
              accumulatedResponse += parsedChunk.content;
              setChatHistory(previous => previous.map((message, index) =>
                index === previous.length - 1 && message.role === "assistant"
                  ? { ...message, content: accumulatedResponse }
                  : message
              ));
            }
          } catch (parseError) {
            console.debug("Skipping malformed JSON chunk:", parseError.message);
          }
        }
      }

      setChatHistory(previous => previous.map((message, index) =>
        index === previous.length - 1 ? { ...message, content: accumulatedResponse, isStreaming: false } : message
      ));
    } catch (error) {
      if (error.name !== "AbortError") {
        setChatHistory(previous => previous.map((message, index) =>
          index === previous.length - 1 && message.role === "assistant"
            ? { ...message, content: `Sorry, something went wrong: ${error.message}`, isStreaming: false }
            : message
        ));
      }
    } finally {
      setIsStreaming(false);
      streamAbortControllerRef.current = null;
    }
  }, [userInput, isStreaming, chatHistory]);

  const stopStreaming = () => {
    streamAbortControllerRef.current?.abort();
    setIsStreaming(false);
    setChatHistory(previous => previous.map((message, index) =>
      index === previous.length - 1 && message.isStreaming ? { ...message, isStreaming: false } : message
    ));
  };

  return (
    <>
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-zinc-700 to-slate-800 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {isChatOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-neutral-900/95 backdrop-blur-sm border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[600px]">
            {/* Header */}
              <div className="bg-gradient-to-r from-zinc-700 to-slate-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                <span className="text-white font-semibold text-sm">AI Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                {chatHistory.length > 0 && (
                  <button
                    onClick={clearChatHistory}
                    className="text-white/70 hover:text-white text-xs p-1 rounded transition-colors"
                    title="Clear history"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-white/70 hover:text-white p-1 rounded transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-900/50 min-h-[300px] max-h-[400px]">
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-stone-400 text-sm">Hi! I&apos;m your AI assistant.</p>
                  <p className="text-stone-500 text-xs mt-1">Ask me about my projects, skills, or experience.</p>
                </div>
              )}

              {chatHistory.map((message, index) => (
                <div key={index} className={`flex gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "user"
                      ? "bg-neutral-700"
                      : "bg-gradient-to-r from-violet-600 to-purple-600"
                  }`}>
                    <span className="text-white text-xs font-bold">
                      {message.role === "user" ? "You" : "AI"}
                    </span>
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === "user"
                      ? "bg-zinc-700 text-white rounded-tr-md"
                      : "bg-neutral-800 text-stone-300 rounded-tl-md"
                  }`}>
                    {message.role === "assistant" ? (
                      <div className="prose prose-invert prose-sm max-w-none font-sans">
                        <ReactMarkdown>
                          {message.isStreaming && index === chatHistory.length - 1 ? animatedContent : message.content}
                        </ReactMarkdown>
                        {message.isStreaming && index === chatHistory.length - 1 && (
                          <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse ml-1"></span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-sans">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatScrollRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-neutral-800 bg-neutral-900/80">
              <div className="flex gap-2">
                <input
                  ref={messageInputRef}
                  type="text"
                  placeholder={isStreaming ? "AI is thinking..." : "Type your message..."}
                  value={userInput}
                  onChange={(event) => setUserInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && sendMessage()}
                  disabled={isStreaming}
                  className="flex-1 bg-neutral-800 text-stone-200 placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm border border-neutral-700 focus:border-violet-500 focus:outline-none transition-colors disabled:opacity-50"
                />
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    className="bg-red-500 hover:bg-red-400 text-white rounded-xl px-4 py-2.5 transition-all active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={sendMessage}
                    disabled={!userInput.trim()}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 transition-all active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AI;