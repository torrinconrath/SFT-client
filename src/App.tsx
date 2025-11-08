import React, { useState, useRef, useEffect, useCallback } from "react";
import FileDecoder from "./components/FileDecoder";
import VoiceOutput from "./components/VoiceOutput";
import DevMetrics, { type MetricsData } from "./components/DevMetrics";
import type { ChatMessage } from "./types/chat";
import { createVoiceDecoder, type VoiceRecognitionHandlers } from "./components/VoiceDecoder";
import { useChatStorage } from "./hooks/useChatStorage";
import "./App.css";

function App() {
  const { messages, setMessages, clearMessages } = useChatStorage();
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const voiceRef = useRef<VoiceRecognitionHandlers | null>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  
  // State to hold the metrics functions
  const [metricsFunctions, setMetricsFunctions] = useState<{
    startRequestMonitoring: () => void;
    completeRequestMonitoring: (responseText: string, modelInfo?: string) => void;
  } | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleDevMode = () => {
    setDevMode(prev => !prev);
  };

  const handleSendText = async () => {
    if (!input.trim()) return;
    await sendMessage(input, "text");
    setInput("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileUrl = URL.createObjectURL(file);
      
      setMessages((prev) => [
        ...prev, 
        { 
          type: "file", 
          content: file, 
          previewUrl: fileUrl,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

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
            return [...prev, { type: "audio", content: transcript, timestamp: new Date().toISOString() }];
          });
        },
        () => {
          setListening(false);
          if (voiceRef.current) {
            const finalText = voiceRef.current.getDecodedText();
            if (finalText.trim()) {
              sendMessage(finalText, "audio");
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
      setMessages(prev => prev.filter(msg => msg.type !== "audio"));
      voiceRef.current.start();
      setListening(true);
    }
  };

  const handleDecoded = async (text: string) => {
    if (text && text !== "No text could be recognized." && !text.includes("Error decoding")) {
      await sendMessage(text, "file");
    }
  };

  const sendMessage = async (content: string, inputType: "text" | "audio" | "file" = "text") => {
    if (!content.trim()) return;

    // Remove any interim audio messages
    setMessages(prev => prev.filter(msg => !(msg.type === "audio" && msg.content === content)));

    const userMessage: ChatMessage = { 
      type: inputType === "file" ? "file" : "text", 
      content: content,
      timestamp: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, userMessage]);

    // Start monitoring for dev mode
    if (devMode && metricsFunctions) {
      metricsFunctions.startRequestMonitoring();
    }

    try {
      const res = await fetch("https://unexperienced-unsapientially-janelle.ngrok-free.dev/chat", {
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
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, botMessage]);

      // Complete monitoring for dev mode
      if (devMode && metricsFunctions) {
        metricsFunctions.completeRequestMonitoring(data.response);
      }

    } catch (err) {
      console.error("Error talking to backend:", err);
      const errorMessage: ChatMessage = { 
        type: "bot", 
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      // Complete monitoring with error for dev mode
      if (devMode && metricsFunctions) {
        metricsFunctions.completeRequestMonitoring("Error response");
      }
    }
  };

  const handleMetricsUpdate = (metrics: MetricsData) => {
    console.log('Metrics updated:', metrics);
    // You can send metrics to analytics, store in localStorage, etc.
  };

  const handleFunctionsReady = useCallback((functions: {
    startRequestMonitoring: () => void;
    completeRequestMonitoring: (responseText: string, modelInfo?: string) => void;
  }) => {
    setMetricsFunctions(functions);
  }, []);

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
            className={`toggle-button ${devMode ? 'dev-active' : ''}`}
            onClick={toggleDevMode}
            title="Toggle development metrics"
          >
            {devMode ? '🔬 Dev Mode ON' : '🔧 Dev Mode'}
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
                  msg.type === "text" || msg.type === "file" || msg.type === "audio"
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
                      <span>{msg.content as string}</span>
                      <VoiceOutput text={msg.content as string} />
                    </div>
                  )}
                  {msg.type === "file" && (
                    <div className="file-message">
                      <img
                        src={(msg as any).previewUrl}
                        alt="uploaded file"
                        className="chat-image"
                      />
                      <FileDecoder message={msg} onDecoded={handleDecoded} />
                    </div>
                  )}
                  {msg.type === "audio" && (
                    <div className="audio-message">
                      <span>🎤 {msg.content as string}</span>
                      {listening && <div className="recording-indicator">● Recording...</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="input-area">
            <input
              type="text"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              placeholder="Type your message or use voice/file input..."
            />
            <button className="send-button" onClick={handleSendText}>
              📤 Send
            </button>

            <label className="file-upload-button send-button">
              📎 Upload
              <input 
                type="file" 
                onChange={handleFileUpload} 
                accept=".pdf,.png,.jpg,.jpeg,.gif" 
                hidden 
              />
            </label>

            <button
              className="voice-button send-button"
              onClick={handleVoiceToggle}
              style={{ backgroundColor: listening ? "#ff4d4d" : "#00bfff" }}
            >
              {listening ? "⏹️ Stop" : "🎤 Voice"}
            </button>
          </div>
        </div>

        <DevMetrics 
          isEnabled={devMode}
          onMetricsUpdate={handleMetricsUpdate}
          onFunctionsReady={handleFunctionsReady}
        />
      </div>
    </div>
  );
}

export default App;


// Here are two normal medical questions you could ask a bot:

// What are the common symptoms of seasonal allergies and what over-the-counter treatments are usually recommended?

// When should someone seek medical attention for a persistent headache?