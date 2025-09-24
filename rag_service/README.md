# RAG Service (FastAPI)

A minimal FastAPI backend for planning with a YAML-based RAG and pluggable LLM providers.

## Setup

```bash
cd rag_service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export RAG_YAML=$(pwd)/app/rag.yaml
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- GET /health → { ok: true }
- POST /plan
  - Body:
    ```json
    {
      "text": "Get me the hierarchy of agent 3945X",
      "provider": "ollama",
      "provider_config": { "base_url": "http://localhost:11434", "model": "llama3" }
    }
    ```
  - Response:
    ```json
    {
      "plan": [
        { "step": 1, "name": "agent hierarchy", "parameters": { "agent_id": "3945X" } }
      ],
      "raw": "..."
    }
    ```

## Notes
- Amazon provider is stubbed; replace with SageMaker Runtime invoke in call_amazon_stub.
- Plan extraction uses a simple regex; improve as needed.
