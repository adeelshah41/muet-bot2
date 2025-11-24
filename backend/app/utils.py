from passlib.context import CryptContext
import jwt
from fastapi import HTTPException
import os

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "supersecretadmin")

def verify_admin(token: str):
    if token != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Not authorized as admin")
    return True


# Use pbkdf2_sha256 instead of bcrypt to avoid 72-byte limit issues
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

def hash_password(password: str):
    # pbkdf2_sha256 doesn't have the 72-byte limit, so we can hash directly
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
