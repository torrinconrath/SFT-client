# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Backend (FastAPI + vLLM)

Follow these steps to add a minimal server-side folder that proxies requests to a vLLM deployment:

**Start vLLM & backend(uv)**  
   Use the provided script (defaults match the sample command you shared). Pass your merged model directory as the first argument:  
   ```bash
   cd server
   # skip venv & install if set up before
   # (optional if you always use uv run) source .venv/bin/activate
   uv venv
   uv pip install -r requirements.txt

   uv run bash start_vllm.sh SFT_merged_model/
   uv run uvicorn main:app --host 0.0.0.0 --port 9000
   ```
   The script:
   - Exports `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1` by default.
   - Runs `vllm serve` on `127.0.0.1:8001` with `--served-model-name Qwen3`, `--dtype bfloat16`, `--quantization awq`, `--gpu-memory-utilization 0.35`, `--swap-space 8`, and `--api-key token-local`.
   - Streams output to `vllm.log`; adjust env vars (`HOST`, `PORT`, `API_KEY`, `MODEL_NAME`, `LOG_FILE`) or the path argument as needed.

   The repo includes `server/` with:
   - `main.py`: FastAPI app that forwards `/chat` requests to the vLLM endpoint.
   - `requirements.txt`: backend dependencies (`fastapi`, `uvicorn`, `httpx`).
   - `.env`: environment variables used by the service.
   - `SFT_merged_model`: for local test, added into .gitignore for repo size

   The React app calls `VITE_API_BASE_URL` (defaults to `http://localhost:9000`) and sends the user text to `/chat`. Make sure the FastAPI process and vLLM server are reachable from the browser.

**Deploy note**  
   - Keep the FastAPI service behind HTTPS and add auth if exposing publicly.
   - Run vLLM on a GPU host; the FastAPI layer can stay lightweight and stateless, so you can scale it separately as traffic grows.
