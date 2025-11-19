from passlib.context import CryptContext
import jwt
from fastapi import HTTPException
import os
from fastapi import HTTPException

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "supersecretadmin")

def verify_admin(token: str):
    if token != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Not authorized as admin")
    return True


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(password: str, hashed_pw: str):
    return pwd_context.verify(password, hashed_pw)

def create_token(email: str):
    return jwt.encode({"sub": email}, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
