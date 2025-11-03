# 🧠 Prescription Integrity

An AI-driven prescription verification and digitization system that ensures accuracy, readability, and integrity in medical prescriptions.  
This project uses OCR for text extraction, LLMs for prescription understanding, and inference services for intelligent verification.

---

## 🚀 Features

- 🩺 **OCR-based extraction** of handwritten prescriptions  
- ⚙️ **AI inference pipeline** using local and Hugging Face models  
- 🧩 **Cross-validation** of medicine names, dosages, and instructions  
- 💾 **MongoDB-backed** data management  
- 🧠 **MedItRon** and **Llama 3.2:8B** model integration via **Ollama**  
- 🔐 **User management** and basic role-based access system  
- ⚡ Modular architecture: **client**, **server**, and **inference service**

---


---

## 📁 Project Structure

```
prescription-integrity/
├── client/                          # React frontend application
│   ├── src/
│   │   ├── api/                     # API client and services
│   │   │   ├── apiClient.js
│   │   │   ├── authService.js
│   │   │   └── prescriptionService.js
│   │   ├── components/              # React components
│   │   │   ├── layout/
│   │   │   │   └── Header.jsx
│   │   │   ├── shared/              # Shared components
│   │   │   │   ├── Chatbot.jsx
│   │   │   │   ├── emergencyContact.jsx
│   │   │   │   ├── MedicationForm.jsx
│   │   │   │   ├── NotificationBell.jsx
│   │   │   │   ├── OCRScanner.jsx
│   │   │   │   ├── PatientSearch.jsx
│   │   │   │   └── PillTimeline.jsx
│   │   │   └── ui/                  # UI components
│   │   │       ├── alert.jsx
│   │   │       ├── button.jsx
│   │   │       ├── card.jsx
│   │   │       ├── dropdown-menu.jsx
│   │   │       ├── input.jsx
│   │   │       ├── label.jsx
│   │   │       ├── sheet.jsx
│   │   │       └── utils.js
│   │   ├── context/                 # React context providers
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/                   # Custom React hooks
│   │   │   └── useSpeechRecognition.jsx
│   │   ├── pages/                   # Page components
│   │   │   ├── dashboards/
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── DoctorDashboard.jsx
│   │   │   │   ├── PatientDashboard.jsx
│   │   │   │   └── ShopDashboard.jsx
│   │   │   ├── ChatPage.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── MyAccount.jsx
│   │   │   ├── Scanner.jsx
│   │   │   └── Signup.jsx
│   │   ├── utils/                   # Utility functions
│   │   │   └── patientUtils.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── server/                          # Node.js backend server
│   ├── config/
│   │   └── db.js                    # Database configuration
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT authentication middleware
│   │   └── roleMiddleware.js        # Role-based access control
│   ├── models/                      # MongoDB models
│   │   ├── Notification.js
│   │   ├── PillSchedule.js
│   │   ├── Prescription.js
│   │   └── User.js
│   ├── routes/                      # API routes
│   │   ├── auth.js                  # Authentication routes
│   │   ├── chatbot.js               # Chatbot API
│   │   ├── pillSchedule.js         # Pill schedule management
│   │   ├── prescriptions.js        # Prescription management
│   │   ├── transcribe.js            # Audio transcription
│   │   └── users.js                 # User management
│   ├── utils/
│   │   └── cache.js                 # Caching utilities (removed Redis)
│   ├── uploads/                     # File upload directory
│   ├── server.js                    # Main server file
│   └── package.json
├── inference-service/               # Python AI inference service
│   ├── venv/                        # Python virtual environment
│   ├── __pycache__/
│   ├── create_knowledge_base.py     # Knowledge base creation
│   ├── inference_service.py         # Main inference service
│   ├── medical_data.json            # Medical knowledge data
│   ├── medical_llm.py               # Medical LLM integration
│   ├── rag_prescription_generator.py # RAG-based prescription generation
│   ├── start_service.py             # Service startup script
│   ├── requirements.txt             # Python dependencies
│   └── README.md
├── FIXES_SUMMARY.md                 # Summary of fixes and improvements
├── LLM.txt                          # LLM configuration and notes
└── README.md                        # Project documentation
```

---

## 🧰 Installation

### Clone the repository
```bash
git clone https://github.com/HackShri/prescription-integrity.git
cd prescription-integrity
```
---

### Installing dependencies

```bash
cd client
npm install
cd ../server
npm install
```
---

## 🧠 Setup inference service

### Create and activate a virtual environment:

```bash
cd inference_service
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows
```

### Install required libraries:

```bash
pip install -r requirements.txt
```

### Run the inference service:

```bash
python inference_service.py
```

---

## 🦙 Install and setup Ollama

### Download Ollama from: https://ollama.ai

## Pull the required models:

```bash
ollama pull llama3.2:8b
ollama pull meditron
```

---

### 🧪 Running the Project
```bash
 # Start the server
cd server
npm run dev
```
```bash
# Start the client
cd client
npm run dev
```

```bash
Start the inference service
cd inference_service
python inference_service.py
```

## 🧭 Future Roadmap

- ✅ OCR module implemented (needs polishing)

- 🔄 Fine-tune prescription validation logic

- 🧩 Improve inference accuracy for complex medical handwriting

- 💬 Add multilingual prescription support

- 📱 Mobile client version (future build)

- ⚙️ Integration with pharmacy APIs for live drug verification

---

## 🤝 How to Contribute

We welcome all contributions!
If you’d like to help make Prescription Integrity better:

Fork the repository
```bash
# Create a new branch
git checkout -b feature/your-feature

#Commit your changes
git commit -m "Added your feature"

#Push to your branch
git push origin feature/your-feature

# Open a Pull Request
```
Please follow the existing code style and include concise commit messages.


## 📫 Contact

For discussions, collaborations, or issues — feel free to open an issue on GitHub or reach out via the Discussions tab.
