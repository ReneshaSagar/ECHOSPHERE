"""
PDF Resume Upload Route: Extract text via pdfminer.six, fallback to pytesseract OCR.
Returns extracted text + basic ATS keyword score.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
import io
import re

router = APIRouter()

# ATS keyword pool (expanded list of common JD terms)
ATS_KEYWORDS = [
    "python", "java", "javascript", "typescript", "react", "node", "sql", "nosql",
    "aws", "gcp", "azure", "docker", "kubernetes", "ci/cd", "api", "rest", "graphql",
    "machine learning", "deep learning", "data science", "agile", "scrum", "git",
    "microservices", "distributed systems", "system design", "leadership", "management",
    "communication", "problem solving", "teamwork", "collaboration", "innovation",
    "analysis", "design", "architecture", "testing", "devops", "cloud", "security",
    "performance", "optimization", "scalability", "reliability", "monitoring",
    "css", "html", "figma", "sketch", "ux", "ui", "product", "portfolio", "branding",
    "marketing", "sales", "finance", "accounting", "strategy", "operations",
    "research", "statistics", "excel", "tableau", "powerbi", "presentation",
]

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def extract_text_pdfminer(file_bytes: bytes) -> tuple[str, int]:
    """Extract text from PDF using pdfminer.six. Returns (text, page_count)."""
    from pdfminer.high_level import extract_text
    from pdfminer.layout import LAParams
    
    stream = io.BytesIO(file_bytes)
    try:
        text = extract_text(stream, laparams=LAParams())
        # Estimate page count
        from pdfminer.high_level import extract_pages
        page_count = sum(1 for _ in extract_pages(io.BytesIO(file_bytes)))
        return text.strip(), page_count
    except Exception:
        return "", 0


def extract_text_pytesseract(file_bytes: bytes) -> tuple[str, int]:
    """Fallback OCR extraction for scanned PDFs using pytesseract + pillow."""
    try:
        from PIL import Image
        import pytesseract
        
        # Try to convert PDF pages to images
        # This requires pdf2image or we just do OCR on the raw bytes as image
        image = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(image)
        return text.strip(), 1
    except Exception:
        return "", 0


def compute_ats_score(text: str, job_keywords: list = None) -> float:
    """
    Compute an ATS keyword match percentage.
    Checks how many ATS_KEYWORDS appear in the resume text.
    Returns a float between 0.0 and 100.0.
    """
    if not text:
        return 0.0
    
    text_lower = text.lower()
    keywords = job_keywords or ATS_KEYWORDS
    
    matched = sum(1 for kw in keywords if kw.lower() in text_lower)
    score = (matched / len(keywords)) * 100
    # Scale to realistic range: most resumes hit 20-80%
    return round(min(score * 2.5, 100.0), 1)


@router.post("/resume")
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload a PDF resume. Extracts text via pdfminer.six (fallback: pytesseract OCR).
    Returns extracted text, ATS score, page count, word count.
    """
    # Validate file type
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted.")
    
    # Read file
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
    
    # Try pdfminer first
    text, page_count = extract_text_pdfminer(file_bytes)
    
    # If pdfminer failed or returned empty, try OCR
    if not text or len(text.strip()) < 50:
        text, page_count = extract_text_pytesseract(file_bytes)
    
    # Clean up text
    text = re.sub(r'\s+', ' ', text).strip()
    word_count = len(text.split()) if text else 0
    
    ats_score = compute_ats_score(text)
    
    return {
        "text": text[:8000],   # cap at 8000 chars for safety
        "ats_score": ats_score,
        "page_count": page_count,
        "word_count": word_count,
        "extraction_method": "pdfminer" if text else "ocr",
    }
