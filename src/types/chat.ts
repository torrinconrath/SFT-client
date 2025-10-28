
export type ChatMessage = {
    type: "text" | "file" | "audio" | "bot";
    content: string | File;
  };