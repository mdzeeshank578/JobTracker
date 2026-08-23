# 💼 JobTracker - Full-Stack AI-Powered Job Search & Application Tracker

**JobTracker** is a comprehensive, full-stack career platform that combines AI-driven job searching, real-time application tracking, interactive interview prep, resume intelligence, and hybrid database sync.

---

## 📋 Table of Contents
- [✨ Key Features](#-key-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Repository Structure](#-repository-structure)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Installation & Local Setup](#installation--local-setup)
  - [Docker Setup](#docker-setup)
- [🔌 API Overview](#-api-overview)
- [🛡️ Security & Privacy](#️-security--privacy)
- [📄 License](#-license)

---

## ✨ Key Features

### 🔍 Live Job Search & Direct Apply Gateway
- **Multi-Source Job Aggregation**: Fetches real-time job listings from Adzuna and Jooble APIs with Groq AI fallback.
- **1-Click Direct Apply Gateway**: In-app application modal with auto-filled applicant details, resume linking, and live fallback link engine.
- **Smart Filtering & Search**: Search by title, location, employment type, salary range, and company.

### 🤖 AI Career Intelligence & Insights
- **AI Success Predictor**: Calculates real-time match scores comparing candidate profile/resume against target job requirements.
- **AI CV Auto-Recommend**: Suggests relevant CV versions and tailored bullet points based on job description.
- **AI Resume Analyzer**: Parses PDF resumes in-browser (`pdfjs-dist`), detecting key skills, experience gaps, and formatting suggestions.
- **AI Career Assistant**: Conversational and voice-enabled assistant powered by Groq (Llama 3.3 70B) & OpenAI for interview tips and career guidance.

### 🎙️ 4-Round AI Practice Session & Interview Studio
- **Multi-Round Interview Simulator**: Custom practice sessions across 4 distinct rounds:
  1. *Technical Screening*
  2. *System Design & Problem Solving*
  3. *Behavioral & Leadership*
  4. *HR & Cultural Fit*
- **Speech & Audio Support**: Voice input/output capabilities with instant AI feedback, scoring, and response evaluation.

### 📊 Job Application Kanban & Analytics
- **Visual Application Pipeline**: Categorize applications by stage (*Saved*, *Applied*, *Interviewing*, *Offered*, *Rejected*).
- **Duplicate Application Detection**: Prevents applying to the same company/role twice.
- **Interactive Analytics**: Visual charts powered by Recharts showing application progress, interview conversion rates, and status distributions.

### 📄 Resume Studio & Profile Management
- **Master CV & Certificate Uploader**: Link master resumes and upload verified credentials/certificates.
- **Smart Autocomplete Engine**: Dynamic title-case suggestions for skills, job titles, institutions, and degrees.
- **Profile Completion Meter**: Real-time progress bar tracking complete profile metadata.

### 🔄 Sync Center & Hybrid Storage Engine
- **Cloud & Local Persistence**: Seamlessly syncs between Supabase / PostgreSQL cloud database and local fallback storage.
- **Offline Reliability**: Full offline support with automatic background re-synchronization when back online.

---

## 🛠️ Tech Stack

### **Frontend**
| Technology | Description |
| :--- | :--- |
| **React 19** | Modern UI framework with Concurrent Rendering |
| **Vite 8** | Next-generation fast frontend tooling & bundler |
| **React Router v7** | Declarative client-side routing |
| **Recharts** | Composability-driven chart library for analytics |
| **Lucide React** | Clean, modular iconography |
| **PDF.js (`pdfjs-dist`)** | In-browser PDF parser for resume analysis |

### **Backend & APIs**
| Technology | Description |
| :--- | :--- |
| **Node.js & Express v4** | Modular REST API server with Controller-Service-Repository pattern |
| **Python 3.10+ & Flask** | Microservice engine for AI processing, scraper/aggregators, & LLM integration |
| **Supabase JS / PostgreSQL (`pg`)** | Relational data persistence with Row Level Security (RLS) |
| **JWT & Rate Limiting** | Authentication middleware and security protection |

### **AI & External Services**
| Service | Purpose |
| :--- | :--- |
| **Groq API (Llama 3.3 70B)** | High-speed LLM inference for AI Interviewer, Resume Analyzer, & Search |
| **OpenAI API** | Natural language processing & chat assistant fallback |
| **Adzuna & Jooble APIs** | Real-time live job search market aggregation |

### **DevOps & Infrastructure**
| Tool | Purpose |
| :--- | :--- |
| **Docker & Docker Compose** | Multi-container setup for Express API & PostgreSQL |
| **PostgreSQL RLS Migrations** | Database schema migrations with Row Level Security |

---

## 📂 Repository Structure

```
JobTracker/
├── src/                        # React 19 Frontend
│   ├── components/             # Modular UI Components
│   │   ├── auth/               # Login & Registration components
│   │   ├── common/             # Autocomplete inputs & shared controls
│   │   ├── dashboard/          # Analytics, Success Predictor, AI Resume Analyzer
│   │   ├── interview/          # 4-Round AI Practice Session modals
│   │   ├── jobs/               # Application Kanban cards & forms
│   │   ├── layout/             # Navbar & Header navigation
│   │   ├── liveJobs/           # Live Job Search, Cards, & Direct Apply Modal
│   │   └── profile/            # Resume Studio & User Profile setup
│   ├── context/                # React Auth & Global State Context
│   ├── services/               # API clients (Supabase, OpenAI, DB fallback)
│   └── App.jsx                 # Application Entry & Route Router
├── backend/                    # Node.js Express REST Backend
│   ├── migrations/             # SQL Migration Scripts (RLS policies)
│   ├── routes/                 # Express API Routes (Auth, Jobs, Profile)
│   ├── scripts/                # Database cleanup & maintenance scripts
│   ├── src/                    # Enterprise Controller-Service Architecture
│   │   ├── config/             # DB & Mailer configs
│   │   ├── controllers/        # Business logic handlers
│   │   ├── middlewares/        # Auth, Rate Limiter, Error & Upload handlers
│   │   ├── models/             # Data models & schemas
│   │   ├── repositories/       # Data Access Layer
│   │   └── services/           # Analytics, Job, & Auth services
│   ├── Dockerfile              # Docker build file for Express Backend
│   ├── docker-compose.yml      # Multi-service compose file
│   └── server.js               # Express server entry point
├── backend/python_api/         # Flask AI & Job Aggregator Microservice
│   └── app.py                  # Flask endpoints (Groq AI, Adzuna, Jooble)
├── package.json                # Root package configuration & npm scripts
├── vite.config.js              # Vite bundler configuration
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher
- **Python**: `v3.10` or higher (for Flask AI microservice)
- **PostgreSQL / Supabase**: Account or local instance (optional, fallback storage supported)

---

### Environment Configuration

#### 1. Express Backend (`backend/.env`)
Create a `.env` file inside the `backend/` directory:
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
DATABASE_URL=postgresql://postgres:password@localhost:5432/jobtracker
```

#### 2. Python AI Service (`backend/python_api/.env`)
Create a `.env` file inside `backend/python_api/`:
```env
FRONTEND_ORIGIN=http://localhost:5173
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
JOOBLE_API_KEY=your_jooble_api_key
```

---

### Installation & Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mdzeeshank578/JobTracker.git
   cd JobTracker
   ```

2. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```

3. **Install Express Backend Dependencies**:
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Install Python AI API Dependencies**:
   ```bash
   cd backend/python_api
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install flask flask-cors requests python-dotenv
   cd ../..
   ```

5. **Run the Services**:
   - **Frontend**:
     ```bash
     npm run dev
     ```
   - **Express Sync API**:
     ```bash
     npm run server:sync
     ```
   - **Python AI & Jobs API**:
     ```bash
     npm run server:jobs
     ```

---

### Docker Setup

Alternatively, you can spin up the backend services using Docker:

```bash
cd backend
docker-compose up --build
```

---

## 🔌 API Overview

### Node.js Express Endpoints (`http://localhost:5000`)
- `POST /api/auth/register` — User registration
- `POST /api/auth/login` — User authentication & JWT generation
- `GET /api/jobs` — Retrieve tracked user application items
- `POST /api/jobs` — Create new application entry
- `PUT /api/jobs/:id` — Update application status/details
- `DELETE /api/jobs/:id` — Remove job application
- `GET /api/profile` — Fetch candidate profile and linked CVs

### Python Flask Endpoints (`http://localhost:5001`)
- `POST /api/search-jobs` — Fetch live job aggregations (Adzuna + Jooble + Groq)
- `POST /api/ai/predict-match` — Run AI job fit scoring
- `POST /api/ai/interview-practice` — Generate 4-Round practice questions & evaluate answers
- `POST /api/ai/analyze-resume` — Analyze resume text against job descriptions

---

## 🛡️ Security & Privacy

- **Row Level Security (RLS)**: Enforced via PostgreSQL migrations so users can only access their own applications.
- **JWT Protection**: Secure API route authorization.
- **Client-side PDF Extraction**: Resume parsing occurs directly in the browser via `pdfjs-dist` to protect sensitive documents.

---

## 📄 License

This project is licensed under the **MIT License**.
