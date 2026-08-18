# JobTracker Python Live Jobs API

This Flask service powers the Live Jobs page. It keeps provider secrets on the backend, queries Adzuna first, falls back to Jooble, caches repeated searches, and asks Groq for resume/job matching when a resume is available.

## Setup

1. Create a virtual environment from this folder.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and fill in your keys.

```bash
cp .env.example .env
```

Required for live jobs:

- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`

Optional fallback and AI:

- `JOOBLE_API_KEY`
- `GROQ_API_KEY`
- `GROQ_MODEL`

3. Start the API.

```bash
python app.py
```

The frontend expects `http://localhost:8000` unless `VITE_LIVE_JOBS_API_BASE` is set.
