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
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const processFile = async () => {
      if (decoded || message.type !== "file") return;

      const file = message.content as File;
      setLoading(true);

      try {
        let extractedText = "";

        if (file.type === "application/pdf") {
          // Process PDF
          const url = URL.createObjectURL(file);
          const pdf = await pdfjsLib.getDocument(url).promise;
          let fullText = "";

          // Process first 3 pages to avoid performance issues
          const pageLimit = Math.min(pdf.numPages, 3);
          for (let i = 1; i <= pageLimit; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d")!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // ✅ Fixed: Include canvas in render parameters
            await page.render({
              canvasContext: context,
              viewport: viewport,
              canvas: canvas, // Add this required property
            }).promise;

            const worker = await createWorker("eng");
            await worker.setParameters({
              tessedit_pageseg_mode: PSM.AUTO,
            });

            const { data } = await worker.recognize(canvas);
            fullText += data.text + "\n\n";
            await worker.terminate();
          }

          extractedText = fullText.replace(/\s+/g, " ").trim();
          URL.revokeObjectURL(url);
        } else if (file.type.startsWith("image/")) {
          // Process image
          const url = URL.createObjectURL(file);
          const worker = await createWorker("eng");
          
          await worker.setParameters({
            tessedit_pageseg_mode: PSM.AUTO,
          });

          const { data } = await worker.recognize(url);
          extractedText = data.text.replace(/\s+/g, " ").trim();
          
          await worker.terminate();
          URL.revokeObjectURL(url);
        } else {
          extractedText = "Unsupported file type";
        }

        if (!extractedText) {
          extractedText = "No text could be recognized in this file.";
        }

        setDecoded(extractedText);
        onDecoded(extractedText);
      } catch (err) {
        console.error("File processing failed:", err);
        const errorText = "Error processing file. Please try another file.";
        setDecoded(errorText);
        onDecoded(errorText);
      } finally {
        setLoading(false);
      }
    };

    processFile();
  }, [message, decoded, onDecoded]);

  if (loading) {
    return <div className="decoded-message">🔄 Processing file...</div>;
  }

  return decoded ? (
    <div className="decoded-message">
      <strong>Extracted text:</strong> {decoded}
    </div>
  ) : null;
};

export default FileDecoder;