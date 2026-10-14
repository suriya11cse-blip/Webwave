from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChatMessage
from app.schemas import ChatInput
from app.chatbot import get_bot_reply

router = APIRouter()


@router.post("/")
def chat(data: ChatInput, db: Session = Depends(get_db)):
    reply = get_bot_reply(data.message)

    try:
        record = ChatMessage(
            user_id=data.user_id,
            message=data.message,
            response=reply,
        )
        db.add(record)
        db.commit()
    except Exception:
        db.rollback()

    return {"reply": reply}