from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .auth import router as auth_router
from .chat import router as chat_router
from .admin import router as admin_router
import uvicorn

app = FastAPI()

# CORS setup - Allow all origins for development
# Note: When using allow_origins=["*"], allow_credentials must be False
# For production, replace with specific frontend URLs and set allow_credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for development)
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers to frontend
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(admin_router)

@app.get("/")
def root():
    return {"msg": "Mehran University Assistant Backend running"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
