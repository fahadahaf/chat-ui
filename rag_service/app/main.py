from fastapi import FastAPI, Body
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import hashlib
import os
import random
import yaml
import re
import httpx
import os


class ProviderConfig(BaseModel):
    base_url: Optional[str] = None
    model: Optional[str] = None
    region: Optional[str] = None
    endpoint: Optional[str] = None


class PlanRequest(BaseModel):
    text: str
    history: Optional[list[str]] = None
    provider: str  # "ollama" | "amazon"
    provider_config: ProviderConfig


class TablePayload(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    title: Optional[str] = None


class PlanResponse(BaseModel):
    plan: Any
    raw: Optional[str] = None
    table: Optional[TablePayload] = None


def load_rag(path: str) -> List[Dict[str, Any]]:
    with open(path, "r") as f:
        data = yaml.safe_load(f) or []
        if isinstance(data, dict):
            # support dict with root key
            for k in ["queries", "data", "items"]:
                if k in data and isinstance(data[k], list):
                    return data[k]
            return []
        return data if isinstance(data, list) else []


RAG_PATH = os.environ.get("RAG_YAML", os.path.join(os.path.dirname(__file__), "rag.yaml"))
RAG_DATA = load_rag(RAG_PATH)
CHROMA_DIR = os.environ.get("RAG_CHROMA_DIR", os.path.join(os.path.dirname(__file__), "chroma"))

try:
    import chromadb  # type: ignore
    from sentence_transformers import SentenceTransformer  # type: ignore
    _chroma_client = None
    _chroma_collection = None
    _embedder = None

    def _get_chroma():
        global _chroma_client, _chroma_collection, _embedder
        if _chroma_client is None:
            os.makedirs(CHROMA_DIR, exist_ok=True)
            _chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
        if _embedder is None:
            _embedder = SentenceTransformer('all-MiniLM-L6-v2')
        if _chroma_collection is None:
            _chroma_collection = _chroma_client.get_or_create_collection("rag_queries")
        return _chroma_client, _chroma_collection, _embedder

    def _rag_fp() -> str:
        try:
            with open(RAG_PATH, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()
        except Exception:
            return ''

    _rag_fp_file = os.path.join(CHROMA_DIR, 'rag.sha256')

    def _ensure_index():
        client, col, embedder = _get_chroma()
        fp = _rag_fp()
        prev = ''
        if os.path.exists(_rag_fp_file):
            try:
                with open(_rag_fp_file, 'r') as f:
                    prev = f.read().strip()
            except Exception:
                prev = ''
        if fp and fp == prev:
            return
        try:
            client.delete_collection("rag_queries")
        except Exception:
            pass
        _, col, embedder = _get_chroma()
        ids: List[str] = []
        docs: List[str] = []
        metas: List[Dict[str, Any]] = []
        for i, item in enumerate(RAG_DATA):
            text = f"name: {item.get('name','')}\n description: {item.get('description','')}\n parameters: {item.get('parameters', [])}"
            ids.append(f"q_{i}")
            docs.append(text)
            metas.append(item)
        if docs:
            embs = embedder.encode(docs).tolist()
            col.add(ids=ids, documents=docs, metadatas=metas, embeddings=embs)
        with open(_rag_fp_file, 'w') as f:
            f.write(fp)
    _has_chroma = True
except Exception:
    _has_chroma = False

app = FastAPI(title="Agent RAG Service")


@app.get("/health")
async def health():
    return {"ok": True}


def simple_retriever(text: str, k: int = 5) -> List[Dict[str, Any]]:
    if _has_chroma:
        try:
            _ensure_index()
            _, col, embedder = _get_chroma()
            emb = embedder.encode([text]).tolist()
            res = col.query(query_embeddings=emb, n_results=k)
            metas = (res.get('metadatas') or [[]])[0]
            return metas
        except Exception:
            pass
    # Fallback keyword retriever
    text_l = text.lower()
    scored: List[tuple[int, Dict[str, Any]]] = []
    for item in RAG_DATA:
        name = str(item.get("name", "")).lower()
        desc = str(item.get("description", "")).lower()
        score = 0
        for token in set(text_l.split()):
            if token in name:
                score += 2
            if token in desc:
                score += 1
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [i for _, i in scored[:k]]


PROMPT_TEMPLATE = (
    "You are a planner. Based on the user input and the available Gremlin queries, "
    "produce a JSON array called JSON:[ ... ] with a plan of steps. Each step is an object "
    "with fields: step (int), name (string equal to a query name), parameters (dict matching "
    "the query's parameter names and Python-typed values). Use only the provided query names and parameter names.\n\n"
    "Conversation context (most recent first):\n{history}\n\n"
    "User: {user}\n\nAvailable queries (YAML-like):\n{rag}\n\n"
    "Return only your plan as JSON:[ ... ] and nothing else."
)


async def call_ollama_chat(base_url: str, model: str, prompt: str) -> str:
    url = base_url.rstrip("/") + "/api/chat"
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        })
        resp.raise_for_status()
        data = resp.json()
        # Try to extract content from common fields
        message = data.get("message") or (data.get("messages") or [{}])[-1]
        return (message or {}).get("content", "")


async def call_amazon_stub(region: str, endpoint: str, prompt: str) -> str:
    # Placeholder: Integrate with SageMaker Runtime invoke_endpoint later
    # For now, return an echo including a simple JSON plan hint
    return (
        "JSON:[{"
        "\"step\": 1, \"name\": \"agent hierarchy\", \"parameters\": {\"agent_id\": \"3945X\"}"
        "}]"
    )


def extract_json_plan(text: str) -> Any:
    # Look for JSON:[ ... ] block
    m = re.search(r"JSON:\s*(\[.*\])", text, flags=re.DOTALL)
    blob = None
    if m:
        blob = m.group(1)
    else:
        # Try to find first top-level array
        m2 = re.search(r"(\[\s*{[\s\S]*?}\s*\])", text)
        if m2:
            blob = m2.group(1)
    if blob:
        try:
            import json
            return json.loads(blob)
        except Exception:
            pass
    return {"error": "Could not parse plan", "raw": text}


def gremlin_execution(plan: Any) -> TablePayload:
    """Dummy execution that returns a random table (8-10 columns, 10-20 rows)."""
    num_cols = random.randint(8, 10)
    columns = [f"column{i}" for i in range(1, num_cols + 1)]
    num_rows = random.randint(10, 20)

    def random_value() -> Any:
        choice = random.randint(0, 3)
        if choice == 0:
            return random.randint(0, 1000)
        if choice == 1:
            return round(random.uniform(0, 1000), 2)
        if choice == 2:
            return f"value_{random.randint(1000, 9999)}"
        return bool(random.getrandbits(1))

    rows: List[Dict[str, Any]] = []
    for _ in range(num_rows):
        row = {c: random_value() for c in columns}
        rows.append(row)

    return TablePayload(title="Results", columns=columns, rows=rows)


@app.post("/plan", response_model=PlanResponse)
async def plan(req: PlanRequest):
    hits = simple_retriever(req.text)
    if not hits:
        # Fallback when nothing relevant is found in RAG
        dummy = gremlin_execution(None)
        dummy.title = "No Relevant Query - Results"
        return PlanResponse(
            plan=[
                {
                    "step": 0,
                    "name": "no relevant query",
                    "parameters": {},
                    "message": "No relevant RAG query found for the request"
                }
            ],
            raw=None,
            table=dummy,
        )
    rag_block = yaml.safe_dump(hits, sort_keys=False, allow_unicode=True)
    history_block = "\n".join((req.history or [])[::-1])  # most recent first
    prompt = PROMPT_TEMPLATE.format(user=req.text, rag=rag_block, history=history_block)

    if req.provider == "ollama":
        if not req.provider_config.base_url or not req.provider_config.model:
            return PlanResponse(plan={"error": "Missing Ollama config"}, raw=None)
        raw = await call_ollama_chat(req.provider_config.base_url, req.provider_config.model, prompt)
    else:
        # amazon
        if not req.provider_config.region or not req.provider_config.endpoint:
            return PlanResponse(plan={"error": "Missing Amazon config"}, raw=None)
        raw = await call_amazon_stub(req.provider_config.region, req.provider_config.endpoint, prompt)

    plan = extract_json_plan(raw)
    print(plan)
    # Dummy execution returns a random table
    table = gremlin_execution(plan)
    return PlanResponse(plan=plan, raw=raw, table=table)


