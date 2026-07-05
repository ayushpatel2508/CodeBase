import json
import logging
import asyncio
from sqlalchemy.orm import Session
from openai import AsyncOpenAI

from app.config import settings
from app.services.embeddings import get_embedding_async
from app.services.vector_store import search_similar_chunks
from app.models.user import User
from app.models.repository import Repository
from app.services.chat_memory import get_chat_history, add_messages_to_history
from app.services.cache import get_cached_query, set_cached_query

logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.openai_api_key)

# Tool definition — the LLM can call this to search the codebase
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_codebase",
            "description": (
                "Search the user's GitHub repository for relevant code chunks. "
                "Call this ONLY when the user asks something specific about their "
                "codebase — like how a feature works, where something is implemented, "
                "what a file does, or about specific functions/classes. "
                "Do NOT call this for greetings, general programming concepts, "
                "or questions that don't require looking at the actual code."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant code chunks in the repository"
                    }
                },
                "required": ["query"]
            }
        }
    }
]


def _build_system_instruction(repo=None):
    """Builds the system instruction for the AI assistant."""
    repo_grounding = ""
    if repo:
        repo_grounding = (
            f"You are a code assistant for a SPECIFIC repository.\n"
            f"Repository Name: {getattr(repo, 'name', 'Unknown')}\n"
            f"Repository URL: {getattr(repo, 'github_url', 'Unknown')}\n"
            f"CRITICAL RULE: You must ONLY answer about this specific repository. "
            f"If the user asks about any other repository or shares a different link, "
            f"tell them to switch the active repository first. "
            f"Never mix information from different repositories.\n\n"
        )
        
    return (
        f"{repo_grounding}"
        "You are an expert code assistant and pair programmer helping a developer analyze their GitHub repository.\n\n"
        "You have access to a tool called `search_codebase` that lets you search the repository for relevant code.\n"
        "Use the tool when the user asks about their specific codebase. Do NOT use it for greetings or general programming concepts.\n\n"
        "Follow these rules strictly:\n"
        "1. **Codebase Questions**: If the user asks about the codebase, use the search_codebase tool first, then answer clearly using the retrieved chunks. "
        "Weave code snippets seamlessly into your explanation, and clearly cite the exact file paths.\n"
        "2. **General Concepts**: If the user asks a general programming question (e.g., 'What is async/await?'), "
        "explain the concept clearly without calling the tool. Do NOT include any code snippets or code blocks in your response unless you called the `search_codebase` tool.\n"
        "3. **Conversational**: If the user sends a greeting (e.g., 'hi') or a conversational message, respond politely and naturally without any code blocks.\n"
        "4. **Missing Info**: Only state that you cannot find the information if the tool returned no results for a codebase-specific question. "
        "Do NOT invent or hallucinate codebase specifics.\n"
        "5. **Assumption Correction**: If the retrieved chunks do not support the user's assumption, correct the assumption politely before answering.\n"
        "6. **Strict Accuracy**: Never invent file names, function names, or code not present in the chunks.\n"
        "7. **Inferences**: If you are inferring something not explicitly stated in the chunks, use phrases like 'it appears' or 'based on the code it seems'.\n"
        "8. **Missing Features**: If the user asks about a technology or feature not present in the retrieved chunks or repo tech stack, say it does not appear to exist in this repository.\n"
        "9. **Code Verification**: Do not confirm that pasted code belongs to the repository unless it exactly matches something in the retrieved chunks.\n"
        "10. **Contextual Awareness**: Treat every new user message as a distinct request.\n\n"
        "11. **Format**: Keep answers concise. Start with a 1-2 sentence direct answer, then elaborate only if needed. Use a code block only when directly quoting from retrieved chunks, never for general explanation.\n"
        "12. **Partial Matches / Likely Location**: If the retrieved chunks don't directly answer the question, "
        "but the file tree shows a file whose name or path strongly suggests it's relevant (e.g., a file named "
        "'authController' for an authentication question), mention it as a likely location the user can check — "
        "but do not describe its contents or claim what code is inside unless that file's chunks were actually retrieved. "
        "Only reference file names that appear in the provided File Tree or retrieved chunks; never invent a filename.\n\n"
        "Always respond naturally and conversationally (like ChatGPT). Do NOT use rigid headers like '**Answer:**' or '**Reference:**'."
    )


def _build_repo_metadata(repo, db=None):
    """Builds the repository metadata block to include in the prompt."""
    if not repo:
        return ""
        
    return (
        f"REPOSITORY METADATA:\n"
        f"Name: {getattr(repo, 'name', 'Unknown') or 'Unknown'}\n"
        f"GitHub URL: {getattr(repo, 'github_url', 'Not available') or 'Not available'}\n"
        f"File Tree:\n{chr(10).join(repo.parsed_tree) if getattr(repo, 'parsed_tree', None) else 'Not available'}\n"
    )


def _build_chunks_block(similar_chunks):
    """Formats the retrieved code chunks into a clean text block."""
    if not similar_chunks:
        return "RETRIEVED CODE CHUNKS: None — no relevant code found."
    
    parts = []
    for idx, chunk in enumerate(similar_chunks, 1):
        parts.append(
            f"--- CHUNK {idx} ---\n"
            f"Name: {getattr(chunk, 'name', 'Unknown')}\n"
            f"File: {getattr(chunk, 'filepath', 'Unknown')}\n"
            f"Lines: {getattr(chunk, 'line_start', 0)}–{getattr(chunk, 'line_end', 0)}\n"
            f"Type: {getattr(chunk, 'chunk_type', 'Unknown')}\n"
            f"Code:\n{chunk.content}"
        )
    return "RETRIEVED CODE CHUNKS:\n" + "\n\n".join(parts)


async def stream_repository_query(db: Session, repo_id: str, query: str, user: User, request=None):
    """
    Agentic RAG function (Streaming):
    1. Sends the user's question to the LLM with a search_codebase tool
    2. If the LLM decides to call the tool, runs vector search and makes a second streaming call
    3. If the LLM answers directly, yields the response immediately
    """
    logger.info(f"Answering query for repo {repo_id}: {query}")
    
    cached_answer = get_cached_query(repo_id, query)
    if cached_answer:
        yield {"type": "status", "message": "Using cached answer..."}
        for char in cached_answer:
            if request and await request.is_disconnected():
                logger.info("Client disconnected, aborting response.")
                break
            yield {"type": "chunk", "text": char}
            
        if not (request and await request.is_disconnected()):
            asyncio.create_task(
                asyncio.to_thread(add_messages_to_history, str(user.id), repo_id, query, cached_answer)
            )
        return
    
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    system_instruction = _build_system_instruction(repo)
    repo_metadata = _build_repo_metadata(repo, db)
    
    chat_history = get_chat_history(str(user.id), repo_id, limit=10)
    
    messages = [
        {"role": "system", "content": system_instruction}
    ]
    
    if chat_history:
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
    
    repo_name = getattr(repo, 'name', 'this repository') if repo else 'this repository'
    grounding = (
        f"REMINDER: Answer only about {repo_name}. "
        f"If the question is about a different repo, say so.\n\n"
    )
    user_message = f"{repo_metadata}\n{grounding}User Question: {query}" if repo_metadata else f"{grounding}User Question: {query}"
    messages.append({"role": "user", "content": user_message})
    
    try:
        logger.info("Making first LLM call (decision phase)...")
        first_response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.2,
            max_tokens=1000,
            timeout=15.0
        )
        
        first_message = first_response.choices[0].message
        
        if first_message.tool_calls:
            yield {"type": "status", "message": "Calling external tool (search_codebase)..."}
            
            messages.append(first_message)
            all_chunks = []
            
            embedding_tasks = []
            for tool_call in first_message.tool_calls:
                search_query = json.loads(tool_call.function.arguments).get("query", query)
                logger.info(f"LLM requested tool call: search_codebase(query='{search_query}')")
                embedding_tasks.append(get_embedding_async(search_query))
                
            embeddings = await asyncio.gather(*embedding_tasks)
            
            unique_chunks = {}
            for query_embedding in embeddings:
                similar_chunks = search_similar_chunks(db, repo_id, query_embedding, limit=15, min_similarity=0.3)
                for chunk in similar_chunks:
                    if chunk.id not in unique_chunks:
                        unique_chunks[chunk.id] = chunk 
                        
            all_chunks = list(unique_chunks.values())[:10]
            logger.info(f"Vector search returned {len(all_chunks)} unique deduplicated chunks")
            
            combined_chunks_block = _build_chunks_block(all_chunks)
            
            for idx, tool_call in enumerate(first_message.tool_calls):
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": combined_chunks_block if idx == 0 else "Chunks provided in previous tool response."
                })
            
            logger.info("Making second LLM call (streaming with context)...")
            
            yield {"type": "status", "message": "Forming answer from retrieved context..."}
            
            response = await client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=messages,
                temperature=0.3,
                max_tokens=2000,
                stream=True,
                timeout=30.0
            )
            
            full_answer = ""
            async for chunk in response:
                if request and await request.is_disconnected():
                    logger.info("Client disconnected, aborting OpenAI stream.")
                    break
                    
                text = chunk.choices[0].delta.content
                if text:
                    full_answer += text
                    yield {"type": "chunk", "text": text}
        
        else:
            logger.info("LLM answered directly (no tool call needed)")
            
            yield {"type": "status", "message": "Forming answer..."}
            
            full_answer = first_message.content or ""
            
            # Yield the complete response character by character for a smooth streaming effect
            for char in full_answer:
                if request and await request.is_disconnected():
                    logger.info("Client disconnected, aborting response.")
                    break
                yield {"type": "chunk", "text": char}
        
        if full_answer and not (request and await request.is_disconnected()):
            set_cached_query(repo_id, query, full_answer)
            asyncio.create_task(
                asyncio.to_thread(add_messages_to_history, str(user.id), repo_id, query, full_answer)
            )
            
    except Exception as e:
        logger.error(f"LLM Generation Error: {e}")
        yield {"type": "chunk", "text": "I'm sorry, I encountered an API error while trying to generate the answer."}
