from pydantic import BaseModel, EmailStr, field_validator


class SignupData(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        cleaned = "".join(c for c in v if c.isdigit())
        if len(cleaned) < 10:
            raise ValueError("Phone must have at least 10 digits")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginData(BaseModel):
    email: EmailStr
    password: str


class ChatInput(BaseModel):
    message: str
    user_id: int | None = None


class AuthResponse(BaseModel):
    message: str
    token: str
    name: str
    email: str