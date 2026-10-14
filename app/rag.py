import os
import chromadb
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer

load_dotenv()

KNOWLEDGE_FILE = "app/data/webwave_knowledge.txt"
VECTOR_DIR = "app/vector_store"
COLLECTION_NAME = "webwave_kb"

_collection = None
_client = None
_vectorizer = None
_chunks_cache = []


def _get_vectorizer():
    global _vectorizer
    if _vectorizer is None:
        _vectorizer = TfidfVectorizer(
            max_features=500,
            stop_words='english',
            ngram_range=(1, 2)
        )
    return _vectorizer


def _chunk_text(text: str, chunk_size: int = 500):
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
    global _collection, _client, _chunks_cache

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

        # Load chunks from vector store
        results = _collection.get(include=["documents"])
        _chunks_cache = results.get("documents", [])

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

        # Use TF-IDF embeddings (lightweight!)
        vectorizer = _get_vectorizer()
        embeddings = vectorizer.fit_transform(chunks).toarray().tolist()

        for i, chunk in enumerate(chunks):
            _collection.add(
                documents=[chunk],
                embeddings=[embeddings[i]],
                ids=[f"chunk_{i}"]
            )
        _chunks_cache = chunks
        print(f"[OK] Vector store built ({_collection.count()} chunks)")

    return _collection


def get_relevant_context(query: str, k: int = 3) -> str:
    collection = _get_collection()
    if collection is None:
        return ""
    try:
        # Keyword-based search (TF-IDF)
        if not _chunks_cache:
            return ""

        vectorizer = _get_vectorizer()
        # Fit on chunks if not fit
        if not hasattr(vectorizer, 'vocabulary_') or not vectorizer.vocabulary_:
            vectorizer.fit(_chunks_cache)

        query_vec = vectorizer.transform([query])
        # Get top k chunks by simple keyword matching
        query_words = set(query.lower().split())

        scored = []
        for i, chunk in enumerate(_chunks_cache):
            chunk_words = set(chunk.lower().split())
            overlap = len(query_words & chunk_words)
            scored.append((overlap, i))

        scored.sort(reverse=True)
        top_indices = [i for _, i in scored[:k]]

        docs = [_chunks_cache[i] for i in top_indices]
        return "\n\n---\n\n".join(docs) if docs else ""
    except Exception as e:
        print(f"[!] RAG error: {e}")
        return ""