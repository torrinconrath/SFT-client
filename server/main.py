"""
Minimal FastAPI proxy that forwards chat requests from the React client
to a running vLLM OpenAI-compatible server.
"""

import os
import time
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

CORS_ALLOW_ORIGINS_DEFAULT = ["http://localhost:5173"]
VLLM_URL = os.getenv("VLLM_URL", "http://127.0.0.1:8001/v1/chat/completions")
MODEL_NAME = os.getenv("VLLM_MODEL", "Qwen3")
VLLM_API_KEY = os.getenv("VLLM_API_KEY", "token-local")
SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT", "")
REQUEST_TIMEOUT = float(os.getenv("VLLM_TIMEOUT", "60"))
TEMPERATURE = float(os.getenv("VLLM_TEMPERATURE", "0.7"))
CORS_ALLOW_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", ",".join(CORS_ALLOW_ORIGINS_DEFAULT)).split(",")
    if origin.strip()
]

app = FastAPI(title="SFT Chatbot Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
http_client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    inference_time: Optional[float] = None


@app.on_event("shutdown")
async def shutdown_client() -> None:
    await http_client.aclose()


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest) -> ChatResponse:
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": body.message},
        ],
        "temperature": TEMPERATURE,
    }

    start = time.perf_counter()
    headers = {}
    if VLLM_API_KEY:
        headers["Authorization"] = f"Bearer {VLLM_API_KEY}"

    try:
        vllm_response = await http_client.post(VLLM_URL, json=payload, headers=headers or None)
        vllm_response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"vLLM request failed: {exc}") from exc

    duration = time.perf_counter() - start
    data = vllm_response.json()
    content = data["choices"][0]["message"]["content"]

    return ChatResponse(response=content, inference_time=duration)
