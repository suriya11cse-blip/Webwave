import os
from dotenv import load_dotenv
from groq import Groq

from app.rag import get_relevant_context

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

_client = None
MODEL_NAME = "openai/gpt-oss-120b"

if GROQ_API_KEY:
    try:
        _client = Groq(api_key=GROQ_API_KEY)
        print(f"[OK] Groq client initialized (model: {MODEL_NAME})")
    except Exception as e:
        print(f"[!] Groq client error: {e}")


SYSTEM_PROMPT = """
You are WEBWAVE AI Assistant - a smart, friendly, multilingual chatbot for the WEBWAVE website.

ABOUT WEBWAVE:
WEBWAVE provides real-world opportunities (internships, part-time jobs, career mentoring), industry-oriented courses (technical + non-technical), digital skills training, and lab internships. 100% free for job seekers.

Services:
- Internships & Part-Time Jobs (Kovilpatti: Bombay Sweets, Jeyaraj & Co, Silver Stone)
- Career Mentoring & Counselling
- Technical Courses: Web Dev (MERN), AI/ML, Robotics, IoT, AR/VR, Design (UI/UX, 3D), Blockchain, Cyber Security
- Non-Technical Courses: MBA, Marketing, Entrepreneurship, IPR, Supply Chain
- Lab Internships: Aarthi Laboratory, Narbhavi Diagnostic Centre (life science)
- Industrial AI Knowledge for engineering students
- Digital Skills: Content Creation, Canva Designing

RULES:
1. Use the CONTEXT below to answer WEBWAVE questions.
2. If context is empty, say: Adhu pathi exact details WhatsApp group-la kelunga, team help pannuvanga!
3. Never make up info.
4. Answer in user's language (Tamil, English, Hindi, Tanglish).
5. Keep replies short (2-4 sentences).
6. No markdown. Plain text only.
7. Use emojis occasionally.

PERSONALITY:
- Friendly, warm, helpful friend
- Never say "I am an AI" - you ARE WEBWAVE AI
"""


def get_bot_reply(msg: str) -> str:
    """RAG + Groq API reply."""

    if not msg or not msg.strip():
        return "Enna kelvi venum? Type pannunga"

    if not _client:
        return "AI is not configured. Please check GROQ_API_KEY."

    try:
        context = get_relevant_context(msg)

        if context:
            user_content = f"""CONTEXT:
{context}

USER QUESTION: {msg}

Answer based on the context above."""
        else:
            user_content = f"""USER QUESTION: {msg}

If about WEBWAVE, say details are available on WhatsApp group."""

        response = _client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            temperature=0.7,
            max_tokens=600,
        )

        reply = response.choices[0].message.content.strip()
        return reply if reply else "Sorry, purila"

    except Exception as e:
        print(f"[!] Groq Error: {type(e).__name__}: {e}")
        return "AI service temporarily down. Please try again."