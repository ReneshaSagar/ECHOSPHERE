# Google Drive & PDF Resume Support Walkthrough

## What Was Built

We integrated **Google Drive Link** and **PDF Resume Upload** into the candidate application flow. Candidates can submit their resume either as a shareable Google Drive link or by uploading a PDF directly, while keeping the entire core architecture (`Resume → ResumeText → JD + Resume + LinkedIn + GitHub → Blueprint → Agora Voice AI Agent`) completely unchanged.

---

## Key Implementation Details

### 1. 🔗 Google Drive Provider (`frontend/lib/drive/index.ts`)
- **Link Parser**: Extracts standard Google Drive file IDs from all standard URL variants:
  - `https://drive.google.com/file/d/{id}/view...`
  - `https://drive.google.com/open?id={id}`
  - `https://drive.google.com/uc?id={id}...`
  - `https://docs.google.com/document/d/{id}/...`
- **File Retrieval**: Downloads the document using official Google Drive endpoints and direct shared file export.
- **Strict Private / Inaccessible Guardrail**: If a Drive file is private or requires authorization, the API immediately catches it and returns HTTP 400 with a clear, user-friendly instruction:
  > *"The Google Drive file is private or inaccessible. Please ensure link sharing is set to 'Anyone with the link can view' and try again."*

### 2. 📄 Unified PDF Text Extraction (`frontend/lib/resume/extract.ts`)
- Utilizes `pdf-parse` to extract plain text from downloaded Google Drive PDFs or directly uploaded PDF files.
- Cleans and normalizes whitespace, stripping headers and page markers.
- Feeds extracted text directly into `resumeText`, allowing downstream LinkedIn and GitHub enrichment to process as normal.

### 3. 🎨 Application Form UI (`frontend/app/jobs/[id]/apply/page.tsx`)
- Added tab selector for candidates:
  - 🔗 **Google Drive Link**: Input for shareable link with guidance on link permissions (`"Anyone with the link can view"`).
  - 📄 **Upload PDF**: File dropzone accepting `.pdf` documents with file size feedback.
  - 📝 **Paste Text**: Plain text area fallback.
- Client-side validation ensuring valid inputs and real-time error banner rendering.

---

## Verification & Testing

### 1. Private Drive Link Validation Test
- **Payload**: `resumeDriveUrl = "https://drive.google.com/file/d/1BxiMVs.../view"`
- **Response**: `HTTP 400 Bad Request`
- **Error Body**:
  ```json
  {
    "error": "The Google Drive file is private or inaccessible. Please ensure link sharing is set to 'Anyone with the link can view' and try again."
  }
  ```

### 2. Full End-to-End Test (`app_bpjv4dp`)
- **Candidate**: Jordan Lee (`Jordan_Lee_Resume.pdf` uploaded as base64)
- **Extracted Resume Text**: Cleanly parsed text stored in `data.json` under `resumeText`.
- **Enrichment**: Multi-channel LinkedIn + GitHub enrichment triggered automatically.
- **Interview Scheduled**: `int_lpdbjax`
- **Blueprint Generated**: `bp_rk2z89a`
- **Voice AI Agent Spoken Greeting**:
  > *"Hello Jordan Lee, welcome! I've been reviewing your background, including your GitHub projects like 'syn-2' and 'ExpensWise' and 'HealthLens' (with 117 commits in the past 30 days). Today, we will focus on Technical Architecture & Concurrency. Let's dive in."*

---

## Active Service Endpoints
- **Next.js Frontend**: [`http://localhost:3000`](http://localhost:3000)
- **FastAPI Backend**: [`http://localhost:8000/docs`](http://localhost:8000/docs)
- **Job Application Form**: [`http://localhost:3000/jobs/j1/apply`](http://localhost:3000/jobs/j1/apply)
- **ATS Review Page**: [`http://localhost:3000/admin/applications/app_bpjv4dp`](http://localhost:3000/admin/applications/app_bpjv4dp)
