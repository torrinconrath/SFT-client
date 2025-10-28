import React, { useEffect, useState } from "react";

interface VoiceOutputProps {
  text: string;
  autoPlay?: boolean;
}

const VoiceOutput: React.FC<VoiceOutputProps> = ({ text, autoPlay = false }) => {
  const [speaking, setSpeaking] = useState(false);

  const speak = () => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel(); // stop any ongoing speech
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (autoPlay && text) {
      speak();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="voice-output">
      <button
        className="send-button"
        onClick={speak}
        disabled={speaking}
        style={{ backgroundColor: speaking ? "#ffcc00" : "#4CAF50" }}
      >
        {speaking ? "🔊 Speaking..." : "▶️ Speak"}
      </button>
    </div>
  );
};

export default VoiceOutput;
