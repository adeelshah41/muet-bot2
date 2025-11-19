from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from datetime import datetime
from .database import users_collection, history_collection
from .utils import verify_admin
import json

router = APIRouter()

# Helper function to convert datetime objects to ISO string format
def convert_datetime(obj):
    """
    Convert datetime objects to string (ISO format) in the response data.
    """
    if isinstance(obj, datetime):
        return obj.isoformat()  # Return as ISO 8601 string
    raise TypeError(f"Type {type(obj)} not serializable")

# Endpoint to get all users
@router.get("/admin/users")
async def get_all_users(admin_token: str = Query(...)):
    verify_admin(admin_token)
    users = list(users_collection.find({}, {"_id": 0, "email": 1}))
    return JSONResponse(content=users)

# Endpoint to get user chat history
@router.get("/admin/user-history")
async def get_user_history(email: str, admin_token: str = Query(...)):
    verify_admin(admin_token)
    chats = list(history_collection.find({"user": email}, {"_id": 0}))
    
    # Convert datetime fields in the chats to ISO strings
    for chat in chats:
        if "timestamp" in chat:
            chat["timestamp"] = convert_datetime(chat["timestamp"])
    
    return JSONResponse(content=chats)
