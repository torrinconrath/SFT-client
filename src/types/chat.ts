export interface ChatMessage {
  type: "text" | "bot" | "file" | "audio";
  content: string | File;
  previewUrl?: string;
  timestamp?: string;
  isProcessed?: boolean;
}