import React, { useEffect, useState } from "react";
import { createWorker, PSM } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import type { ChatMessage } from "../types/chat";

// ✅ Worker import for bundlers like Vite/CRA
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface FileDecoderProps {
  message: ChatMessage;
  onDecoded: (text: string) => void;
}

const FileDecoder: React.FC<FileDecoderProps> = ({ message, onDecoded }) => {
  const [decoded, setDecoded] = useState<string>("");

  useEffect(() => {
    const processFile = async () => {
      if (decoded || message.type !== "file") return;

      const file = message.content as File;
      const url = URL.createObjectURL(file);
      let fullText = "";

      const worker = await createWorker("eng"); // already loads language

      try {
        let imageUrl: string;

        if (file.type === "application/pdf") {
          const pdf = await pdfjsLib.getDocument(url).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2 });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d")!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          // ✅ Keep canvas in render params to avoid errors
          await page.render({ canvasContext: context, viewport, canvas }).promise;
          imageUrl = canvas.toDataURL();
        } else {
          imageUrl = url;
        }

        await worker.setParameters({
          tessedit_pageseg_mode: PSM.AUTO, // more forgiving for multi-line
        });

        const { data } = await worker.recognize(imageUrl);
        fullText = data.text.replace(/\s+/g, " ").trim();

        if (!fullText) fullText = "No text could be recognized.";

        setDecoded(fullText);
        onDecoded(fullText);
      } catch (err) {
        console.error("File OCR failed:", err);
        const errorText = "Error decoding file.";
        setDecoded(errorText);
        onDecoded(errorText);
      } finally {
        await worker.terminate();
      }
    };

    processFile();
  }, [message]);

  return decoded ? <div className="decoded-message">{decoded}</div> : null;
};

export default FileDecoder;
