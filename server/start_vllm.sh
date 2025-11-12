#!/usr/bin/env bash
set -euo pipefail

MODEL_DIR=${1:-/SFT_merged_model}
HOST=${HOST:-127.0.0.1}
PORT=${PORT:-8001}
API_KEY=${API_KEY:-token-local}
LOG_FILE=${LOG_FILE:-vllm.log}
MODEL_NAME=${MODEL_NAME:-Qwen3}

export HF_HUB_OFFLINE=${HF_HUB_OFFLINE:-1}
export TRANSFORMERS_OFFLINE=${TRANSFORMERS_OFFLINE:-1}

echo "Starting vLLM with model directory: ${MODEL_DIR}"

nohup vllm serve "${MODEL_DIR}" \
  --host "${HOST}" \
  --port "${PORT}" \
  --dtype float16 \
  --quantization fp8 \
  --max-model-len 4096 \
  --max-num-batched-tokens 4096 \
  --gpu-memory-utilization 0.35 \
  --swap-space "${SWAP_SPACE:-2}" \
  --api-key "${API_KEY}" \
  --served-model-name "${MODEL_NAME}" \
  > "${LOG_FILE}" 2>&1 &

echo "vLLM started on ${HOST}:${PORT}. Logs -> ${LOG_FILE}"
