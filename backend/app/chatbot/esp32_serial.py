import serial
import time
import json
import requests

# --- Configuration ---
ESP32_PORT = "COM5"   # Change to your ESP32 serial port (e.g. "/dev/ttyUSB0" on Linux/Mac)
BAUD_RATE = 921600
BACKEND_URL = "http://127.0.0.1:8000/chat"  # FastAPI backend
TOKEN = "your_jwt_token_here"  # replace with an actual user token

# --- Setup serial connection ---
try:
    esp32 = serial.Serial(ESP32_PORT, BAUD_RATE, timeout=1)
    print(f"[CONNECTED] ESP32 on {ESP32_PORT}")
except Exception as e:
    print(f"[ERROR] Could not open serial port: {e}")
    exit(1)


def send_to_esp32(text):
    """Send clean text to ESP32 through serial."""
    text = text.replace("\n", " ").strip()
    esp32.write((text + "\n").encode())
    print(f"[SENT → ESP32]: {text}")


def ask_backend(message):
    """Send a message to FastAPI backend and return the chatbot response."""
    try:
        response = requests.post(
            BACKEND_URL,
            json={"message": message, "token": TOKEN},
            timeout=60
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("answer", "")
        else:
            print(f"[ERROR] Backend returned {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")
        return None


def main():
    while True:
        user_input = input("\n🎤 Say something (or type 'exit'): ")
        if user_input.lower() == "exit":
            break

        print("[INFO] Sending to backend...")
        answer = ask_backend(user_input)
        if answer:
            print(f"[BOT]: {answer}")
            send_to_esp32(answer)
        else:
            print("[ERROR] No response from backend.")


if __name__ == "__main__":
    main()
