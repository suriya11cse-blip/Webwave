from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import SignupData, LoginData, AuthResponse
from app.auth import hash_password, verify_password, create_token

router = APIRouter()


@router.post("/signup", status_code=201)
def signup(data: SignupData, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(400, "Email already registered. Please login.")

    user = User(
        name=data.name.strip(),
        email=data.email.lower().strip(),
        phone=data.phone.strip() if data.phone else None,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Account created successfully! Please login.",
        "name": user.name,
        "email": user.email,
    }


@router.post("/login", response_model=AuthResponse)
def login(data: LoginData, db: Session = Depends(get_db)):
    """
    Login with EITHER email OR phone number.
    """
    login_id = data.email.strip().lower()

    # Detect: email or phone?
    is_email = "@" in login_id

    if is_email:
        user = db.query(User).filter(User.email == login_id).first()
    else:
        # Phone: strip non-digits
        phone_clean = "".join(c for c in login_id if c.isdigit() or c == "+")
        user = db.query(User).filter(
            (User.phone == login_id) | (User.phone == phone_clean)
        ).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid email/phone or password")

    token = create_token({"sub": str(user.id), "email": user.email})
    return AuthResponse(
        message="Login successful",
        token=token,
        name=user.name,
        email=user.email,
    )