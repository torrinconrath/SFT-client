import React, { useState, useRef, useEffect } from "react";
import FileDecoder from "./components/FileDecoder";
import VoiceOutput from "./components/VoiceOutput";
import DevMetrics from "./components/DevMetrics";
import type { ChatMessage } from "./types/chat";
import { createVoiceDecoder, type VoiceRecognitionHandlers } from "./components/VoiceDecoder";
import { useChatStorage } from "./hooks/useChatStorage";
import { useDevMetrics } from "./hooks/useDevMetrics";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_BASE_URL = "https://declined-perfect-sewing-experimental.trycloudflare.com ";

function App() {
  const { messages, setMessages, clearMessages } = useChatStorage();
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const voiceRef = useRef<VoiceRecognitionHandlers | null>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);


  // Simplified DevMetrics hook (no callbacks)
  const { metrics, startMonitoring, completeMonitoring, clearMetrics } = useDevMetrics(devMode);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // Dev mode function
  const toggleDevMode = () => setDevMode((prev) => !prev);

  // Standard send text
  const handleSendText = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      type: "text",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    await sendMessage(input);
    setInput("");
  };

  // File Upload send
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      const fileMessage: ChatMessage = {
        type: "file",
        content: file,
        previewUrl: fileUrl,
        timestamp: new Date().toISOString(),
        isProcessed: false, // Initialize the file as not processed
      };
      setMessages((prev) => [...prev, fileMessage]);
    }
    
    // Reset the input value
    e.target.value = '';
  };

  // Fetches the handles the file after decoding
  const handleFileDecoded = async (timestamp: string, decodedText: string) => {
    
    // Set the message to processed 
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.timestamp === timestamp ? { ...msg, isProcessed: true } : msg
      )
    );
 
    if (decodedText && decodedText !== "No text could be recognized." && !decodedText.includes("Error decoding")) {
      await sendMessage(decodedText);
    }
  };

  // Voice Upload send
  const handleVoiceToggle = () => {
    if (!voiceRef.current) {
      voiceRef.current = createVoiceDecoder(
        (transcript) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage?.type === "audio") {
              lastMessage.content = transcript;
              return newMessages;
            }
            return [
              ...prev,
              { type: "audio", content: transcript, timestamp: new Date().toISOString() },
            ];
          });
        },
        () => {
          setListening(false);
          if (voiceRef.current) {
            const finalText = voiceRef.current.getDecodedText();
            if (finalText.trim()) {

              setMessages((prev) =>
                prev.filter((msg) => !(msg.type === "audio" && msg.content === finalText))
              );
              sendMessage(finalText);         
              
            }
          }
        }
      );
      if (!voiceRef.current) return;
    }

    if (listening) {
      voiceRef.current.stop();
      setListening(false);
    } else {
      setMessages((prev) => prev.filter((msg) => msg.type !== "audio"));
      voiceRef.current.start();
      setListening(true);
    }
  };

  // Main send message logic (text, file, or audio)
  const sendMessage = async ( content: string ) => {
    if (!content.trim()) return;

    // Start metrics collection (only if devMode is active)
    if (devMode) startMonitoring();

    try {

      setLoading(true)

      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const botMessage: ChatMessage = {
        type: "bot",
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);

      // Complete metrics with inference time (if available)
      if (devMode) completeMonitoring(data.response, data.inference_time);
    } catch (err) {
      console.error("Error talking to backend:", err);
      const errorMessage: ChatMessage = {
        type: "bot",
        content:
          "Sorry, I'm having trouble connecting right now. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      // Complete metrics with error
      if (devMode) completeMonitoring("Error response", 0);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>Chatbot</h1>
          <button
            className="toggle-button"
            onClick={clearMessages}
            title="Clear chat history"
          >
            🗑️ Clear Chat
          </button>

          <button
            className={`toggle-button ${devMode ? "dev-active" : ""}`}
            onClick={toggleDevMode}
            title="Toggle development metrics"
          >
            {devMode ? "🔬 Dev Mode ON" : "🔧 Dev Mode"}
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="chat-section">
          <div className="chat-window" ref={chatWindowRef}>
            {messages.length === 0 && (
              <div className="welcome-message">
                <p>Welcome! You can:</p>
                <ul>
                  <li>Type your message</li>
                  <li>Upload files (images/PDFs) for text extraction</li>
                  <li>Use voice input with the microphone</li>
                </ul>
                <p>Bot responses will include text-to-speech.</p>
                {devMode && (
                  <div className="dev-mode-notice">
                    🧪 Development metrics are enabled
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={`${msg.timestamp}-${index}`}
                className={`chat-message ${
                  msg.type === "text" ||
                  msg.type === "file" ||
                  msg.type === "audio"
                    ? "user-message"
                    : msg.type === "bot"
                    ? "bot-message"
                    : ""
                }`}
              >
                <div className="message-content">
                  {msg.type === "text" && <span>{msg.content as string}</span>}
                  {msg.type === "bot" && (
                    <div className="bot-message-container">
                      <ReactMarkdown
                        components={{
                          strong: ({ node, ...props }) => <strong style={{ fontWeight: "bold" }} {...props} />,
                          li: ({ node, ...props }) => <li style={{ marginLeft: "1.2em" }} {...props} />,
                          ul: ({ node, ...props }) => <ul style={{ paddingLeft: "1.5em", marginTop: "0.5em" }} {...props} />,
                          p: ({ node, ...props }) => <p style={{ marginBottom: "0.5em" }} {...props} />,
                        }}
                      >
                        {msg.content as string}
                      </ReactMarkdown>

                      {msg.content && typeof msg.content === "string" && msg.content.trim() && (
                         <div className="voice-output-buttons">
                            <VoiceOutput text={msg.content as string} />
                            <button
                              className="copy-button"
                              onClick={() => navigator.clipboard.writeText(msg.content as string)}
                            >
                              📋 Copy
                            </button>
                      </div>
                      )}

                    </div>
                  )}
                  {msg.type === "file" && (
                    <div className="file-message">
                      <img
                        src={(msg as any).previewUrl}
                        alt="uploaded file"
                        className="chat-image"
                      />
                      <FileDecoder message={msg} onDecoded={handleFileDecoded} />
                    </div>
                  )}
                  {msg.type === "audio" && (
                    <div className="audio-message">
                      <span>🎤 {msg.content as string}</span>
                      {listening && (
                        <div className="recording-indicator">● Recording...</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading animation always at the bottom if loading */}
            {loading && (
              <div className="chat-message bot-message loading-message">
                <div className="loading-dots">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </div>
                <p>Bot is typing...</p>
              </div>
            )}
          </div>

          <div className="input-area">
            <input
              name="chat-input"
              type="text"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              placeholder="Type your message or use voice/file input..."
              disabled={loading} 
            />
            <button className="send-button" onClick={handleSendText} disabled={loading}>
              📤 Send
            </button>

            <label className="file-upload-button send-button">
              📎 Upload
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.png,.jpg,.jpeg,.gif"
                hidden
                disabled={loading}
              />
            </label>

            <button
              className="voice-button send-button"
              onClick={handleVoiceToggle}
              style={{ backgroundColor: listening ? "#ff4d4d" : "#00bfff" }}
              disabled={loading}
            >
              {listening ? "⏹️ Stop" : "🎤 Voice"}
            </button>
          </div>
        </div>

        {/* Dev metrics panel */}
        <DevMetrics
          isEnabled={devMode}
          metrics={metrics}
          clearMetrics={clearMetrics}
        />
      </div>
    </div>
  );
}

export default App;

// Here are two normal medical questions you could ask a bot:

// What are the common symptoms of seasonal allergies and what over-the-counter treatments are usually recommended?

// When should someone seek medical attention for a persistent headache?
