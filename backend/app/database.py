import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
client = MongoClient(MONGO_URI)
db = client["Muet_chatbot"]

users_collection = db["users"]
history_collection = db["chat_history"]
