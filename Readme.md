---

# 💬 ** Voice-Enabled University Assistant**

A full-stack voice-enabled chatbot designed for universities.
The backend runs on **FastAPI + Uvicorn**, and the frontend runs using **npm (Vite/React)**.

---

## 🚀 **Features**

* FastAPI backend for chatbot processing
* Frontend interface built with modern JavaScript frameworks
* Virtual environment support
* Easy local setup
* Real-time communication support (if applicable)

---

# 📦 **Installation & Setup**

Follow these steps to run the project on your local machine.

---

## **1️⃣ Clone the Repository**

```sh
git clone https://github.com/yourusername/yourrepo.git
cd yourrepo
```

---

## **2️⃣ Create a Virtual Environment (Python)**

Inside the project folder:

### **Windows**

```sh
python -m venv venv
venv\Scripts\activate
```

### **Mac/Linux**

```sh
python3 -m venv venv
source venv/bin/activate
```

---

## **3️⃣ Install Required Python Libraries**

Make sure you are inside the virtual environment:

```sh
pip install -r requirements.txt
```

---

# 🖥 **Running the Project**

## **4️⃣ Start the Backend**

Navigate into the `backend` folder:

```sh
cd backend
```

Run Uvicorn:

```sh
uvicorn app.main:app --reload
```

This will start your backend server at:

```
http://127.0.0.1:8000
```

---

## **5️⃣ Start the Frontend**

Open a **new terminal**, then:

```sh
cd frontend
npm install   # Only the first time
npm run dev
```

Frontend will run at something like:

```
http://localhost:5173
```

---

# 🔗 **Project Structure**

```
project/
│── backend/
│   └── app/
│       └── main.py      # Main FastAPI entry point
│
│── frontend/
│   ├── src/
│   └── package.json
│
│── requirements.txt
│── .env
│── README.md
```

---

# 🧩 **Tech Stack**

### **Backend**

* Python
* FastAPI
* Uvicorn
* (Libraries from `requirements.txt`)

### **Frontend**

* JavaScript
* npm / Vite
* React (or whatever you're using)

---

# 🙌 **Contributing**

Pull requests are welcome.
Feel free to open an issue for bugs, discussions, or new features.

