export type VoiceRecognitionHandlers = {
  start: () => void;
  stop: () => void;
  getDecodedText: () => string; // new getter
};

export function createVoiceDecoder(
  onResult: (text: string) => void,
  onEnd?: () => void
): VoiceRecognitionHandlers | null {
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
    alert("❌ Speech recognition not supported in this browser.");
    return null;
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let decodedText = ""; // store decoded text

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    decodedText += transcript + " "; // accumulate text
    onResult(transcript);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    getDecodedText: () => decodedText.trim(), // expose accumulated text
  };
}
