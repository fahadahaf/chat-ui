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


def normalize_parameters(params: Any) -> List[Dict[str, Any]]:
    """
    Normalize parameters to a list format for internal processing.
    Supports both old list format and new dict format.
    
    Old format: [{name: ..., type: ..., options: ...}]
    New format: {param_name: {type: ..., required: ..., options: ...}}
    """
    if params is None:
        return []
    
    # New dict format: {param_name: {type: ..., required: ..., options: ...}}
    if isinstance(params, dict):
        result = []
        for param_name, param_config in params.items():
            normalized = {
                'name': param_name,
                'type': param_config.get('type', 'string'),
                'required': param_config.get('required', False)
            }
            if 'options' in param_config:
                normalized['options'] = param_config['options']
            result.append(normalized)
        return result
    
    # Old list format: [{name: ..., type: ..., options: ...}]
    if isinstance(params, list):
        # Add 'required' field if missing (default to True for backward compatibility)
        result = []
        for param in params:
            normalized = dict(param)
            if 'required' not in normalized:
                normalized['required'] = True
            result.append(normalized)
        return result
    
    return []


def validate_parameters(query_def: Dict[str, Any], provided_params: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate that all required parameters are provided and have correct types.
    Returns (is_valid, error_message)
    """
    params = normalize_parameters(query_def.get('parameters'))
    
    for param in params:
        param_name = param['name']
        param_type = param.get('type', 'string')
        param_value = provided_params.get(param_name)
        
        # Check if required parameter is present
        if param.get('required', False):
            if param_name not in provided_params or not str(param_value).strip():
                return False, f"Required parameter '{param_name}' is missing or empty"
        
        # If parameter is provided, validate its type
        if param_name in provided_params and param_value is not None and str(param_value).strip():
            # Skip validation for NOT_PROVIDED (will be caught by check_not_provided_params)
            if str(param_value).strip().upper() == "NOT_PROVIDED":
                continue
                
            # Validate based on type
            if param_type == 'number':
                try:
                    float(param_value)
                except (ValueError, TypeError):
                    return False, f"Parameter '{param_name}' must be a number, got: {param_value}"
            
            elif param_type == 'date':
                # Validate YYYY-MM-DD format
                import re
                if not re.match(r'^\d{4}-\d{2}-\d{2}$', str(param_value)):
                    return False, f"Parameter '{param_name}' must be in YYYY-MM-DD format, got: {param_value}"
                # Additional validation: check if it's a valid date
                try:
                    from datetime import datetime
                    datetime.strptime(str(param_value), '%Y-%m-%d')
                except ValueError:
                    return False, f"Parameter '{param_name}' is not a valid date: {param_value}"
            
            elif param_type == 'select':
                # Validate that value is one of the allowed options
                options = param.get('options', [])
                if options and str(param_value) not in options:
                    return False, f"Parameter '{param_name}' must be one of {options}, got: {param_value}"
    
    return True, ""


def check_not_provided_params(plan: Any) -> tuple[bool, List[Dict[str, str]]]:
    """
    Check if any parameters in the plan have NOT_PROVIDED values.
    Returns (has_not_provided, list of missing params with details)
    """
    missing_params = []
    
    if isinstance(plan, list):
        for step in plan:
            query_name = step.get("name")
            provided_params = step.get("parameters", {})
            
            # Find the query definition to get parameter details
            query_def = next((q for q in RAG_DATA if q.get("name") == query_name), None)
            
            for param_name, param_value in provided_params.items():
                if str(param_value).strip().upper() == "NOT_PROVIDED":
                    # Get parameter type for better error message
                    param_type = "value"
                    if query_def:
                        params = normalize_parameters(query_def.get('parameters'))
                        param_def = next((p for p in params if p['name'] == param_name), None)
                        if param_def:
                            param_type = param_def.get('type', 'value')
                    
                    missing_params.append({
                        "query": query_name,
                        "parameter": param_name,
                        "type": param_type
                    })
    
    return len(missing_params) > 0, missing_params


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
            # Normalize parameters for consistent representation
            normalized_params = normalize_parameters(item.get('parameters'))
            param_text = ', '.join([f"{p['name']}({p['type']}{'*' if p.get('required') else ''})" for p in normalized_params])
            text = f"name: {item.get('name','')}\n description: {item.get('description','')}\n parameters: {param_text}"
            ids.append(f"q_{i}")
            docs.append(text)
            # Store normalized parameters in metadata
            item_copy = dict(item)
            item_copy['parameters'] = normalized_params
            metas.append(item_copy)
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


@app.get("/queries")
async def get_queries():
    """Return all available queries from the RAG YAML"""
    # Normalize all queries to use consistent parameter format
    normalized_queries = []
    for query in RAG_DATA:
        query_copy = dict(query)
        query_copy['parameters'] = normalize_parameters(query.get('parameters'))
        normalized_queries.append(query_copy)
    return {"queries": normalized_queries}


@app.post("/execute")
async def execute(req: dict):
    """Execute a predefined plan directly without LLM"""
    plan = req.get("plan")
    if not plan:
        return {"error": "Missing plan"}
    
    # Validate parameters if plan is a list of steps
    if isinstance(plan, list):
        for step in plan:
            query_name = step.get("name")
            provided_params = step.get("parameters", {})
            
            # Find the query definition
            query_def = next((q for q in RAG_DATA if q.get("name") == query_name), None)
            if query_def:
                is_valid, error_msg = validate_parameters(query_def, provided_params)
                if not is_valid:
                    return {"error": f"Validation error for '{query_name}': {error_msg}"}
    
    # Execute using gremlin_execution
    table = gremlin_execution(plan)
    return {"table": table}


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
    "the query's parameter names and values).\n\n"
    "IMPORTANT RULES:\n"
    "1. Use ONLY the exact query names and parameter names from the available queries\n"
    "2. For parameters with 'type: select' and 'options', you MUST use one of the exact option values (case-sensitive)\n"
    "3. For parameters with 'type: date', convert to YYYY-MM-DD format (e.g., 'January 2025' → '2025-01-01', 'July 2025' → '2025-07-31')\n"
    "4. For date ranges, use the first day of start month and last day of end month\n"
    "5. Match natural language to option values (e.g., 'cosmetics' → 'COSMETICS', 'clothing' → 'CLOTHING')\n"
    "6. ALL parameters with 'required: true' MUST be included in your plan - do not skip them\n"
    "7. Parameters with 'required: false' are optional and can be omitted if not mentioned by the user\n"
    "8. CRITICAL: If a required parameter value is NOT clearly provided by the user, you MUST use the exact string \"NOT_PROVIDED\" as its value\n"
    "9. NEVER make assumptions or guess parameter values - if unclear or missing, always use \"NOT_PROVIDED\"\n"
    "10. Examples of missing info:\n"
    "    - User says 'from January 2025' but doesn't specify end date → period_end: \"NOT_PROVIDED\"\n"
    "    - User says 'get products' but doesn't specify line of business → line_of_business: \"NOT_PROVIDED\"\n\n"
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
    
    # Check for NOT_PROVIDED parameters
    has_missing, missing_params = check_not_provided_params(plan)
    if has_missing:
        # Build a user-friendly error message
        missing_list = []
        for mp in missing_params:
            param_display = mp['parameter'].replace('_', ' ')
            missing_list.append(f"• {param_display} ({mp['type']})")
        
        error_message = (
            "I need more information to complete this request. "
            "Please provide the following:\n\n" + 
            "\n".join(missing_list) + 
            "\n\nPlease specify these values in your query."
        )
        
        # Return error in plan format
        return PlanResponse(
            plan=[{
                "step": 0,
                "name": "missing_parameters",
                "parameters": {},
                "message": error_message,
                "missing_params": missing_params
            }],
            raw=raw,
            table=None
        )
    
    # Validate parameter types for each step in the plan
    if isinstance(plan, list):
        for step in plan:
            query_name = step.get("name")
            provided_params = step.get("parameters", {})
            
            # Find the query definition
            query_def = next((q for q in RAG_DATA if q.get("name") == query_name), None)
            if query_def:
                is_valid, error_msg = validate_parameters(query_def, provided_params)
                if not is_valid:
                    # Return type validation error
                    return PlanResponse(
                        plan=[{
                            "step": 0,
                            "name": "validation_error",
                            "parameters": {},
                            "message": f"Parameter validation failed: {error_msg}"
                        }],
                        raw=raw,
                        table=None
                    )
    
    # Dummy execution returns a random table
    table = gremlin_execution(plan)
    return PlanResponse(plan=plan, raw=raw, table=table)


