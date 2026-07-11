# CodeChat — Talk to Your Codebase

An Agentic RAG application that lets developers ask natural-language questions about any GitHub repository and receive accurate, context-aware answers grounded in the actual source code.

## The Problem

Understanding a large, complex codebase can be difficult and time-consuming. Generic AI chatbots often hallucinate or provide incorrect answers because they lack context about your specific project. CodeChat solves this by securely cloning, parsing, and embedding your repository, allowing an AI agent to autonomously search your actual source code before answering — providing highly accurate, project-specific responses without hallucinations.

---

## Architecture

![CodeChat Architecture Diagram](./assets/image.png)

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Backend** | FastAPI | Handles many requests without blocking — needed since we call OpenAI and stream responses back |
| **Database** | PostgreSQL + pgvector | Vector search and regular data live in one database, so there's no separate vector DB to manage |
| **Cache / Queue** | Redis | Does two jobs: caches repeat questions to skip the LLM call, and holds the job queue for background work |
| **Background Jobs** | RQ | Lightweight task queue — repo cloning and embedding takes minutes, so it runs outside the API request |
| **Code Parsing** | Tree-sitter | Splits code by function/class instead of by line count, so each chunk is a complete, meaningful piece |
| **Embeddings** | OpenAI text-embedding-3 | Accurate code embeddings across multiple languages |
| **LLM** | gpt-4o-mini | Cheap and fast, supports function-calling so the model decides when to search the codebase |
| **Frontend** | Next.js | Fast initial page loads and clean auth-protected routes |
| **Rate Limiting** | Redis-based rate limiter | Protects the API from being overwhelmed by a single user |

---

## Architecture Decisions & Tradeoffs

1. **AST Parsing (Abstract Syntax Tree) vs. Recursive Character Splitting**
   - **The Choice:** We parse the code and make chunks logically by divide code into the function, classes, methods, based on what language the code exist. In this we get advantage of storing the syntactical meaning of a code block and treating it as a separate meaningfull entity rather just a group of words.
   - **The Tradeoff:** Tree -sitter library used to make AST of codebase require more computational power and time rather than a recursive character splitting.

2. **Agentic RAG vs. Single-Pass (Naive) RAG**
   - **The Choice:** The LLM receives a `search_codebase` tool with the user query and LLM decide on its own whether to call a tool or answer without a tool calling and also how many time to call a tool. It helps us to reduce latency for the queries which are about general question and no need to query the database and fetch related chunks and also save cost to convert all user query to embeddings.
   - **The Tradeoff:** Our api cost may and latency increase because instead of single LLM call we now do it twice.

3. **Exact Nearest Neighbor (Brute Force) vs. Approximate (HNSW)**
   - **The Choice:** We use pgvector to perform a brute-force mathematical scan (Cosine Similarity) across every chunk in a repository instead of using a Aproximate Nearest Neightbour(ANN) because we store vector embedding of a repository database along with a column of its repository id to which it belongs and due to maximum size of 50mb of repository the chunks are not much generated and in that case brute force give us exact accuracy whereas the HNSW give us a approx accuracy 
   - **The Tradeoff:** HNSW take almost O(log N) time which is very less than typical brute force approach so in future if we plan to increase the repository size supported in our app the query parsing time will increase 

4. **1536-Dimensional Embeddings vs. Smaller Embeddings**
   - **The Choice:** We use OpenAI's `text-embedding-3-large` (1536 dims) over smaller open-source models because bigger and higher the embeddings the more semantic meaning we can get more semantical accuracy for a chunk.
   - **The Tradeoff:** 1536 floats take up 4x more storage space in Postgres and cost money to generate via API.

5. **Dedicated Background Worker (RQ) vs. Synchronous API Blocking**
   - **The Choice:** We offload repository cloning and AST parsing to a separate Redis Queue (RQ) background worker, allowing the API to return immediately and prevent event loop from crashing
   - **The Tradeoff:** This adds infrastructure complexity requiring a separate deployed worker process and state-tracking complexity as the database tracks `processing`/`ready` states, and the frontend polls the backend server to get the current status of repository.

6. **Short-Term Redis Memory vs. Long-Term Semantic History**
   - **The Choice:** We keep only the last 10 chat messages in a Redis sliding window. This saves massive amounts of latency and LLM costs because we completely avoid having to generate semantic summaries of every past Q&A pair and storing them in a separate Postgres table.
   - **The Tradeoff:** We lose the ability to remember the entire history of the conversation as context. If the user refers to a topic they discussed 50 messages ago, the AI will not remember it because it has fallen out of the sliding window.

---

## Key Features

### Agentic RAG (Not Naive RAG)
The LLM autonomously decides whether to search the codebase or answer directly. It receives a tool schema and can issue **parallel tool calls** with optimized search queries — the backend never blindly retrieves chunks for every question.

### Incremental Sync
Clicking "Sync Latest" runs `git diff --name-status <old_hash> HEAD` to identify only added, modified, and deleted files. Only affected chunks are deleted and re-embedded — no full re-ingestion required.

### Structural Code Chunking
Tree-sitter parses source files into AST nodes (functions, classes, methods) across 8 languages (Python, JS, TS, Java, Go, C++, Rust, JSX/TSX). Each chunk preserves its semantic boundary, file path, and line range.

### Exact-Match Query Cache
Repeated questions hit Redis first. On cache hit, the LLM is skipped entirely, returning the cached answer in milliseconds with zero API cost.

### Weighted Sliding Window Rate Limiting
We use custom middleware to block spam at the outermost edge (before routing/validation). We use sliding window algorithm  for ratelimiting .

### Real-Time Streaming (SSE)
Answers stream token-by-token to the frontend via Server-Sent Events. If the user disconnects mid-stream, we immediately cancel the OpenAI call to save tokens.

---

## Local Setup

### Prerequisites
- Python 3.10+ · Node.js 18+ · PostgreSQL (with `pgvector`) · Redis · Git

### Backend
```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/codechat_db
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-...
SECRET_KEY=your_random_secret
```

```bash
# Terminal 1: Start the API server
fastapi dev app/main.py

# Terminal 2: Start the background worker
rq worker high default low
```

### Frontend
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret
```

```bash
npm run dev
```

### Database
```sql
-- Enable vector extension in your PostgreSQL database
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Project Structure
```
code-chat/
├── backend/
│   └── app/
│       ├── main.py                  # FastAPI app + middleware registration
│       ├── middleware/
│       │   └── rate_limiter.py      # Weighted sliding window rate limiter
│       ├── routers/
│       │   ├── auth.py              # Login / Register endpoints
│       │   ├── chat.py              # SSE streaming chat endpoint
│       │   └── repository.py        # Repo CRUD + sync endpoints
│       ├── services/
│       │   ├── rag.py               # Agentic RAG engine (tool calling loop)
│       │   ├── parser.py            # Tree-sitter AST chunking
│       │   ├── embeddings.py        # OpenAI embedding generation
│       │   ├── vector_store.py      # pgvector similarity search
│       │   ├── cache.py             # Redis query cache
│       │   └── github.py            # Git clone, diff, file filtering
│       ├── worker/
│       │   └── ingestion.py         # Background repo processing (RQ)
│       └── models/                  # SQLAlchemy ORM models
├── frontend/
│   └── src/
│       ├── app/                     # Next.js pages & layouts
│       ├── components/              # React UI components
│       └── context/                 # React context providers
└── README.md
```