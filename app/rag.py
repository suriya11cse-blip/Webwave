import os
import chromadb
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv()

KNOWLEDGE_FILE = "app/data/webwave_knowledge.txt"
VECTOR_DIR = "app/vector_store"
COLLECTION_NAME = "webwave_kb"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

_model = None
_collection = None
_client = None


def _get_embedder():
    global _model
    if _model is None:
        print("[*] Loading embedding model...")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        print("[OK] Embedding model loaded")
    return _model


def _embed(text: str):
    model = _get_embedder()
    return model.encode(text).tolist()


def _chunk_text(text: str, chunk_size: int = 800):
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 <= chunk_size:
            current = (current + "\n\n" + para).strip()
        else:
            if current:
                chunks.append(current)
            current = para
    if current:
        chunks.append(current)
    return chunks


def _get_collection(force_rebuild: bool = False):
    global _collection, _client

    if _collection is not None and not force_rebuild:
        return _collection

    if not os.path.exists(KNOWLEDGE_FILE):
        print(f"[!] Knowledge file not found: {KNOWLEDGE_FILE}")
        return None

    os.makedirs(VECTOR_DIR, exist_ok=True)
    _client = chromadb.PersistentClient(path=VECTOR_DIR)

    if force_rebuild:
        try:
            _client.delete_collection(COLLECTION_NAME)
        except Exception:
            pass

    try:
        _collection = _client.get_collection(COLLECTION_NAME)
        if _collection.count() == 0:
            raise ValueError("Empty")
        print(f"[OK] Loaded collection ({_collection.count()} chunks)")
    except Exception:
        print("[*] Building new vector store...")
        with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as f:
            raw_text = f.read()
        chunks = _chunk_text(raw_text)
        print(f"[*] Loaded {len(chunks)} chunks")

        _collection = _client.create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )

        for i, chunk in enumerate(chunks):
            emb = _embed(chunk)
            _collection.add(
                documents=[chunk],
                embeddings=[emb],
                ids=[f"chunk_{i}"]
            )
        print(f"[OK] Vector store built ({_collection.count()} chunks)")

    return _collection


def get_relevant_context(query: str, k: int = 4) -> str:
    collection = _get_collection()
    if collection is None:
        return ""
    try:
        query_emb = _embed(query)
        results = collection.query(
            query_embeddings=[query_emb],
            n_results=k,
            include=["documents"]
        )
        docs = results.get("documents", [[]])[0]
        return "\n\n---\n\n".join(docs) if docs else ""
    except Exception as e:
        print(f"[!] RAG error: {e}")
        return ""