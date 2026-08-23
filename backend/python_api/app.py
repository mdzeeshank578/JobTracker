import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pathlib import Path
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

env_file = Path(__file__).parent / ".env"
if env_file.exists():
    load_dotenv(dotenv_path=env_file)
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_ORIGIN", "*")}})

ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs"
JOOBLE_BASE_URL = "https://jooble.org/api"
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"

CACHE_TTL_SECONDS = int(os.getenv("JOB_SEARCH_CACHE_TTL_SECONDS", "600"))
RESULTS_PER_PAGE = int(os.getenv("JOB_SEARCH_RESULTS_PER_PAGE", "10"))
DEFAULT_ADZUNA_COUNTRY = os.getenv("ADZUNA_COUNTRY", "us").lower()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

_search_cache: Dict[str, Dict[str, Any]] = {}


class JobApiError(Exception):
    def __init__(self, message: str, provider: str, status_code: int = 502):
        super().__init__(message)
        self.provider = provider
        self.status_code = status_code


def _clean_text(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(value))).strip()


def _parse_salary_range(value: Optional[str]) -> Dict[str, Optional[int]]:
    if not value:
        return {"min": None, "max": None}
    numbers = [int(n.replace(",", "")) for n in re.findall(r"\d[\d,]*", value)]
    if not numbers:
        return {"min": None, "max": None}
    if len(numbers) == 1:
        return {"min": numbers[0], "max": None}
    return {"min": min(numbers[0], numbers[1]), "max": max(numbers[0], numbers[1])}


def _cache_key(payload: Dict[str, Any]) -> str:
    resume_text = payload.get("resumeText") or ""
    cache_payload = {
        **{k: v for k, v in payload.items() if k != "resumeText"},
        "resumeFingerprint": hashlib.sha256(resume_text.encode("utf-8")).hexdigest() if resume_text else "",
    }
    raw = json.dumps(cache_payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _get_cached(key: str) -> Optional[Dict[str, Any]]:
    entry = _search_cache.get(key)
    if not entry:
        return None
    if time.time() - entry["stored_at"] > CACHE_TTL_SECONDS:
        _search_cache.pop(key, None)
        return None
    return entry["data"]


def _set_cached(key: str, data: Dict[str, Any]) -> None:
    _search_cache[key] = {"stored_at": time.time(), "data": data}


def _infer_job_type(job: Dict[str, Any], description: str = "") -> str:
    contract_time = (job.get("contract_time") or "").replace("_", "-").title()
    contract_type = (job.get("contract_type") or "").title()
    haystack = f"{contract_time} {contract_type} {description}".lower()
    if "intern" in haystack:
        return "Internship"
    if "part" in haystack:
        return "Part-time"
    if "remote" in haystack:
        return "Remote"
    if contract_time:
        return contract_time
    return contract_type or "Full-time"


def _extract_skills(text: str) -> List[str]:
    known = [
        "Python", "JavaScript", "TypeScript", "React", "Node.js", "Flask",
        "FastAPI", "Django", "SQL", "PostgreSQL", "Express", "AWS",
        "Azure", "GCP", "Docker", "Kubernetes", "Git", "REST", "GraphQL",
        "Machine Learning", "NLP", "Java", "C++", "HTML", "CSS", "Tailwind",
    ]
    lower = text.lower()
    return [skill for skill in known if skill.lower() in lower][:10]


def _extract_sections(description: str) -> Dict[str, List[str]]:
    sentences = [s.strip(" -•\t") for s in re.split(r"(?<=[.!?])\s+|\n+", description) if s.strip()]

    def pick(words: List[str]) -> List[str]:
        return [s for s in sentences if any(w in s.lower() for w in words)][:5]

    return {
        "responsibilities": pick(["responsib", "build", "develop", "manage", "design", "deliver"]),
        "requiredSkills": pick(["require", "must", "experience", "proficien", "skill"]),
        "preferredSkills": pick(["preferred", "nice", "bonus", "plus"]),
        "benefits": pick(["benefit", "insurance", "leave", "equity", "bonus", "remote"]),
    }


def _normalize_adzuna_job(item: Dict[str, Any]) -> Dict[str, Any]:
    description = _clean_text(item.get("description"))
    salary_min = item.get("salary_min")
    salary_max = item.get("salary_max")
    company = item.get("company") or {}
    location = item.get("location") or {}
    sections = _extract_sections(description)
    skills = _extract_skills(description)

    return {
        "id": f"adzuna-{item.get('id')}",
        "sourceApi": "Adzuna",
        "title": item.get("title") or "Untitled role",
        "company": company.get("display_name") or "Company not listed",
        "companyLogo": None,
        "location": location.get("display_name") or "Location not listed",
        "salary": {
            "min": salary_min,
            "max": salary_max,
            "display": _format_salary(salary_min, salary_max),
        },
        "employmentType": _infer_job_type(item, description),
        "experienceRequired": _infer_experience(description),
        "postedDate": item.get("created"),
        "shortDescription": description[:260],
        "description": description,
        "skills": skills,
        "responsibilities": sections["responsibilities"],
        "requiredSkills": sections["requiredSkills"] or skills,
        "preferredSkills": sections["preferredSkills"],
        "benefits": sections["benefits"],
        "companyInfo": f"{company.get('display_name') or 'The company'} is hiring through Adzuna.",
        "applyUrl": item.get("redirect_url"),
        "workplaceType": _infer_workplace(description),
    }


def _normalize_jooble_job(item: Dict[str, Any]) -> Dict[str, Any]:
    description = _clean_text(item.get("snippet") or item.get("description"))
    salary = _clean_text(item.get("salary"))
    sections = _extract_sections(description)
    skills = _extract_skills(description)

    return {
        "id": f"jooble-{hashlib.sha1((item.get('link') or item.get('title') or '').encode()).hexdigest()}",
        "sourceApi": "Jooble",
        "title": item.get("title") or "Untitled role",
        "company": item.get("company") or "Company not listed",
        "companyLogo": None,
        "location": item.get("location") or "Location not listed",
        "salary": {"min": None, "max": None, "display": salary or "Not disclosed"},
        "employmentType": _infer_job_type({}, description),
        "experienceRequired": _infer_experience(description),
        "postedDate": item.get("updated") or item.get("date"),
        "shortDescription": description[:260],
        "description": description,
        "skills": skills,
        "responsibilities": sections["responsibilities"],
        "requiredSkills": sections["requiredSkills"] or skills,
        "preferredSkills": sections["preferredSkills"],
        "benefits": sections["benefits"],
        "companyInfo": f"{item.get('company') or 'The company'} is hiring through Jooble.",
        "applyUrl": item.get("link"),
        "workplaceType": _infer_workplace(description),
    }


def _format_salary(salary_min: Optional[float], salary_max: Optional[float]) -> str:
    if salary_min and salary_max:
        return f"${int(salary_min):,} - ${int(salary_max):,}"
    if salary_min:
        return f"From ${int(salary_min):,}"
    if salary_max:
        return f"Up to ${int(salary_max):,}"
    return "Not disclosed"


def _infer_experience(description: str) -> str:
    match = re.search(r"(\d+)\+?\s*(?:years|yrs)", description, re.I)
    if match:
        years = int(match.group(1))
        return "Fresher" if years == 0 else f"{years}+ years"
    if re.search(r"\bfresher|entry.level|graduate|junior\b", description, re.I):
        return "Fresher"
    if re.search(r"\bsenior|lead|principal|experienced\b", description, re.I):
        return "Experienced"
    return "Not specified"


def _infer_workplace(description: str) -> str:
    lower = description.lower()
    if "hybrid" in lower:
        return "Hybrid"
    if "remote" in lower or "work from home" in lower:
        return "Remote"
    return "Onsite"


def _detect_country_code(location: str) -> str:
    loc = location.lower().strip()
    if not loc:
        return os.getenv("ADZUNA_COUNTRY", "us").lower()

    # Map country names or abbreviations to Adzuna codes
    india_keywords = ["india", "ind", "bangalore", "bengaluru", "mumbai", "delhi", "pune", "hyderabad", "chennai", "kolkata", "gurgaon", "noida", "ahmedabad", "jaipur"]
    uk_keywords = ["united kingdom", "uk", "gb", "great britain", "london", "manchester", "birmingham", "leeds", "glasgow", "edinburgh", "liverpool"]
    us_keywords = ["united states", "usa", "us", "america", "new york", "san francisco", "chicago", "los angeles", "seattle", "boston", "austin", "silicon valley", "california", "texas"]
    ca_keywords = ["canada", "ca", "toronto", "vancouver", "montreal", "ottawa", "calgary"]
    au_keywords = ["australia", "au", "sydney", "melbourne", "brisbane", "perth", "adelaide"]
    de_keywords = ["germany", "de", "berlin", "munich", "frankfurt", "hamburg", "dusseldorf"]
    fr_keywords = ["france", "fr", "paris", "lyon", "marseille"]
    sg_keywords = ["singapore", "sg"]
    nz_keywords = ["new zealand", "nz", "auckland", "wellington"]

    if any(k in loc for k in india_keywords):
        return "in"
    if any(k in loc for k in uk_keywords):
        return "gb"
    if any(k in loc for k in us_keywords):
        return "us"
    if any(k in loc for k in ca_keywords):
        return "ca"
    if any(k in loc for k in au_keywords):
        return "au"
    if any(k in loc for k in de_keywords):
        return "de"
    if any(k in loc for k in fr_keywords):
        return "fr"
    if any(k in loc for k in sg_keywords):
        return "sg"
    if any(k in loc for k in nz_keywords):
        return "nz"

    return os.getenv("ADZUNA_COUNTRY", "us").lower()


def _search_adzuna(filters: Dict[str, Any]) -> Dict[str, Any]:
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")
    if not app_id or not app_key:
        raise JobApiError("Adzuna API keys are not configured.", "Adzuna", 503)

    country = _detect_country_code(filters.get("location") or "")

    salary = _parse_salary_range(filters.get("salaryRange"))
    page = max(int(filters.get("page") or 1), 1)
    job_type = (filters.get("jobType") or "").lower()
    params = {
        "app_id": app_id,
        "app_key": app_key,
        "results_per_page": RESULTS_PER_PAGE,
        "what": filters.get("role") or "",
        "where": filters.get("location") or "",
        "content-type": "application/json",
    }
    if salary["min"]:
        params["salary_min"] = salary["min"]
    if salary["max"]:
        params["salary_max"] = salary["max"]
    if job_type in ("full-time", "full time"):
        params["full_time"] = 1
    if job_type in ("part-time", "part time"):
        params["part_time"] = 1
    if job_type == "remote":
        params["what_or"] = "remote"
    if job_type == "internship":
        params["what_and"] = "internship"

    url = f"{ADZUNA_BASE_URL}/{country}/search/{page}"
    response = requests.get(url, params=params, timeout=12)
    if response.status_code >= 400:
        raise JobApiError(f"Adzuna returned {response.status_code}.", "Adzuna")

    data = response.json()
    jobs = _apply_local_filters([_normalize_adzuna_job(item) for item in data.get("results", [])], filters)
    count = int(data.get("count") or len(jobs))
    return {
        "provider": "Adzuna",
        "jobs": jobs,
        "page": page,
        "total": count,
        "totalPages": max(1, (count + RESULTS_PER_PAGE - 1) // RESULTS_PER_PAGE),
    }


def _search_jooble(filters: Dict[str, Any]) -> Dict[str, Any]:
    key = os.getenv("JOOBLE_API_KEY")
    if not key:
        raise JobApiError("Jooble API key is not configured.", "Jooble", 503)

    page = max(int(filters.get("page") or 1), 1)
    keywords = " ".join(
        value for value in [filters.get("role"), filters.get("experience"), filters.get("jobType")]
        if value
    )
    response = requests.post(
        f"{JOOBLE_BASE_URL}/{key}",
        json={"keywords": keywords, "location": filters.get("location") or "", "page": page},
        timeout=12,
    )
    if response.status_code >= 400:
        raise JobApiError(f"Jooble returned {response.status_code}.", "Jooble")

    data = response.json()
    jobs = _apply_local_filters([_normalize_jooble_job(item) for item in data.get("jobs", [])], filters)
    total = int(data.get("totalCount") or len(jobs))
    return {
        "provider": "Jooble",
        "jobs": jobs,
        "page": page,
        "total": total,
        "totalPages": max(1, (total + RESULTS_PER_PAGE - 1) // RESULTS_PER_PAGE),
    }


def _apply_local_filters(jobs: List[Dict[str, Any]], filters: Dict[str, Any]) -> List[Dict[str, Any]]:
    work_mode = (filters.get("workMode") or "").lower()
    level = (filters.get("level") or filters.get("experience") or "").lower()
    job_type = (filters.get("jobType") or "").lower()

    filtered = jobs
    if work_mode:
      filtered = [job for job in filtered if (job.get("workplaceType") or "").lower() == work_mode]
    if job_type == "internship":
      filtered = [job for job in filtered if "intern" in (job.get("employmentType") or "").lower() or "intern" in (job.get("description") or "").lower()]
    if level == "fresher":
      filtered = [job for job in filtered if "fresher" in (job.get("experienceRequired") or "").lower() or "entry" in (job.get("description") or "").lower() or "graduate" in (job.get("description") or "").lower()]
    if level == "experienced":
      filtered = [job for job in filtered if (job.get("experienceRequired") or "").lower() not in ("not specified", "fresher")]

    return filtered


def _analyze_with_groq(resume_text: str, jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key or not resume_text.strip() or not jobs:
        return jobs

    compact_jobs = [
        {
            "id": job["id"],
            "title": job["title"],
            "skills": job.get("skills", []),
            "description": job.get("description", "")[:1500],
        }
        for job in jobs[:RESULTS_PER_PAGE]
    ]
    prompt = (
        "Return strict JSON only. Analyze this resume against each job. "
        "Schema: {\"analyses\":[{\"id\":\"\", \"resumeMatchPercentage\":0, "
        "\"matchingSkills\":[], \"missingSkills\":[], \"atsScore\":0, "
        "\"resumeImprovementSuggestions\":[], \"interviewReadinessScore\":0}]}\n\n"
        f"Resume:\n{resume_text[:6000]}\n\nJobs:\n{json.dumps(compact_jobs)}"
    )
    response = requests.post(
        GROQ_CHAT_URL,
        headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
        json={
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": "You are an ATS and interview readiness evaluator."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        },
        timeout=25,
    )
    if response.status_code >= 400:
        return jobs

    try:
        content = response.json()["choices"][0]["message"]["content"]
        analyses = {item["id"]: item for item in json.loads(content).get("analyses", [])}
    except (KeyError, ValueError, TypeError):
        return jobs
    for job in jobs:
        job["ai"] = analyses.get(job["id"])
    return jobs


def _generate_mock_jobs(payload: Dict[str, Any]) -> Dict[str, Any]:
    role = payload.get("role") or "Software Professional"
    location = payload.get("location") or "Remote"
    page = max(int(payload.get("page") or 1), 1)

    companies = [
        "Stripe", "Google", "Vercel", "Supabase", "Meta",
        "Linear", "Netflix", "OpenAI", "Airbnb", "Pinterest"
    ]

    jobs = []
    for i, company in enumerate(companies):
        job_id = f"demo-{hashlib.sha1((company + role + str(i)).encode()).hexdigest()[:10]}"
        salary_min = 110000 + (i * 12000)
        salary_max = 160000 + (i * 15000)

        desc = (
            f"We are looking for a talented {role} to join our engineering team at {company}. "
            f"In this role, you will help design, build, and maintain our high-performance core products. "
            f"You will work closely with cross-functional teams including product design, data science, "
            f"and product managers to deliver exceptional experiences to millions of users worldwide."
        )

        skills = _extract_skills(role) + ["REST APIs", "Git", "System Design", "Agile"]
        skills = list(dict.fromkeys(skills))

        jobs.append({
            "id": job_id,
            "sourceApi": "Demo Provider",
            "title": f"{role} ({'Remote' if i % 2 == 0 else 'Hybrid'})",
            "company": company,
            "companyLogo": None,
            "location": location,
            "salary": {
                "min": salary_min,
                "max": salary_max,
                "display": f"${salary_min:,} - ${salary_max:,}",
            },
            "employmentType": "Full-time" if i % 3 != 0 else "Contract",
            "experienceRequired": "Experienced" if i % 2 == 0 else "Fresher",
            "postedDate": datetime.now(timezone.utc).isoformat(),
            "shortDescription": desc[:260] + "...",
            "description": desc,
            "skills": skills,
            "responsibilities": [
                "Collaborate with design and product teams to implement robust solutions.",
                "Write clean, testable, and efficient code.",
                "Participate in design and code reviews to maintain high quality.",
                "Identify and resolve performance bottlenecks."
            ],
            "requiredSkills": skills[:4],
            "preferredSkills": ["Cloud Architecture", "CI/CD pipelines", "Excellent communication"],
            "benefits": ["Premium health insurance", "Generous equity options", "Unlimited PTO", "Home office stipend"],
            "companyInfo": f"{company} is a leading technology company building the future of platforms.",
            "applyUrl": "https://example.com/apply",
            "workplaceType": "Remote" if i % 2 == 0 else "Hybrid",
            "ai": {
                "resumeMatchPercentage": 75 + (i * 3) if i < 8 else 85,
                "matchingSkills": skills[:2],
                "missingSkills": skills[2:4],
                "atsScore": 72 + (i * 2),
                "resumeImprovementSuggestions": [
                    "Add more quantitative achievements related to building robust APIs.",
                    "Highlight experience with frontend-backend integrations and modern frameworks."
                ],
                "interviewReadinessScore": 80
            }
        })

    return {
        "provider": "Demo Provider",
        "jobs": jobs,
        "page": page,
        "total": len(jobs),
        "totalPages": 1,
    }


@app.get("/api/health")
def health() -> Any:
    return jsonify({
        "status": "healthy",
        "adzunaConfigured": bool(os.getenv("ADZUNA_APP_ID") and os.getenv("ADZUNA_APP_KEY")),
        "joobleConfigured": bool(os.getenv("JOOBLE_API_KEY")),
        "groqConfigured": bool(os.getenv("GROQ_API_KEY")),
    })


@app.post("/api/jobs/search")
def search_jobs() -> Any:
    try:
        payload = request.get_json(silent=True) or {}
        if not payload.get("role") and not payload.get("location"):
            return jsonify({"message": "Enter at least a job role or location to search."}), 400

        key = _cache_key(payload)
        cached = _get_cached(key)
        if cached:
            return jsonify({**cached, "cached": True})

        provider_errors = []
        
        app_id = os.getenv("ADZUNA_APP_ID")
        app_key = os.getenv("ADZUNA_APP_KEY")
        jooble_key = os.getenv("JOOBLE_API_KEY")
        
        result = None

        if app_id and app_key:
            try:
                result = _search_adzuna(payload)
            except Exception as adzuna_error:
                provider_errors.append({"provider": "Adzuna", "message": str(adzuna_error)})

        if not result and jooble_key:
            try:
                result = _search_jooble(payload)
            except Exception as jooble_error:
                provider_errors.append({"provider": "Jooble", "message": str(jooble_error)})

        if not result:
            result = _generate_mock_jobs(payload)

        try:
            result["jobs"] = _analyze_with_groq(payload.get("resumeText") or "", result["jobs"])
        except Exception:
            pass

        result["providerErrors"] = provider_errors
        result["generatedAt"] = datetime.now(timezone.utc).isoformat()
        _set_cached(key, result)
        return jsonify({**result, "cached": False})
    except Exception as err:
        print(f"Error handling job search request: {err}")
        payload = request.get_json(silent=True) or {}
        fallback = _generate_mock_jobs(payload)
        fallback["providerErrors"] = [{"provider": "All", "message": str(err)}]
        fallback["generatedAt"] = datetime.now(timezone.utc).isoformat()
        return jsonify({**fallback, "cached": False})


if __name__ == "__main__":
    app.run(host=os.getenv("FLASK_HOST", "127.0.0.1"), port=int(os.getenv("FLASK_PORT", "8000")), debug=os.getenv("FLASK_DEBUG") == "1")
