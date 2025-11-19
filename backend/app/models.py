from pydantic import BaseModel

class UserRegister(BaseModel):
    email: str
    password: str

class ChatRequest(BaseModel):
    message: str
    token: str
