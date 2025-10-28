import React, { useState, useRef } from "react";
import FileDecoder from "./components/FileDecoder";
import type { ChatMessage } from "./types/chat";
import { createVoiceDecoder, type VoiceRecognitionHandlers } from "./components/VoiceDecoder";
import "./App.css";

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const voiceRef = useRef<VoiceRecognitionHandlers | null>(null);

  /**
   * Handle user text input and send it to the backend.
   */
  const handleSendText = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  /**
   * Handle file uploads (passed to FileDecoder).
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileUrl = URL.createObjectURL(file);

      setMessages((prev) => [
        ...prev,
        { type: "file", content: file, previewUrl: fileUrl },
      ]);
    }
  };


  /**
   * Handle voice recording (speech → text).
   */
  const handleVoiceToggle = () => {
    if (!voiceRef.current) {
      voiceRef.current = createVoiceDecoder(
        (transcript) => {
          setMessages((prev) => [...prev, { type: "audio", content: transcript }]);
        },
        () => setListening(false)
      );
      if (!voiceRef.current) return;
    }

    if (listening) {
      voiceRef.current.stop();
      setListening(false);
    } else {
      voiceRef.current.start();
      setListening(true);
    }
  };

  /**
   * Handle decoded text (from file/image/audio).
   */
  const handleDecoded = async (text: string) => {
    await sendMessage(text);
  };

    /**
   * Handles sending the messages and receiving the output.
   */
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = { type: "text", content: text };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("https://2579330b8aca.ngrok-free.app/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const botMessage: ChatMessage = { type: "bot", content: data.response };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Error talking to backend:", err);
    }
  };


  return (
    <div className="app-container">
      <header className="app-header">Chatbot</header>

      <div className="chat-window">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${
              msg.type === "text"
                ? "user-message"
                : msg.type === "bot"
                ? "bot-message"
                : ""
            }`}
          >
            {msg.type === "text" && <span>{msg.content as string}</span>}
            {msg.type === "bot" && <span>{msg.content as string}</span>}

            {msg.type === "file" && (
              <img
                src={(msg.content as any).previewUrl}
                alt="user upload"
                className="chat-image"
              />
            )}

            {msg.type === "audio" && <p>{msg.content as string}</p>}

            {msg.type === "file" && (
              <FileDecoder message={msg} onDecoded={handleDecoded} />
            )}
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
          placeholder="Type your message here..."
        />
        <button className="send-button" onClick={handleSendText}>
          Send
        </button>

        <label className="send-button">
          📎
          <input type="file" onChange={handleFileUpload} hidden />
        </label>

        <button
          className="send-button"
          onClick={handleVoiceToggle}
          style={{ backgroundColor: listening ? "#ff4d4d" : "#00bfff" }}
        >
          {listening ? "⏹ Stop" : "🎤 Speak"}
        </button>
      </div>
    </div>
  );
}

export default App;
