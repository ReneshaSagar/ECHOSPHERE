import { extractTextFromPdfBuffer } from '../resume/extract.ts';

/**
 * Extracts Google Drive file ID from standard shareable links.
 * Supports:
 * - https://drive.google.com/file/d/{id}/view...
 * - https://drive.google.com/open?id={id}
 * - https://drive.google.com/uc?id={id}...
 * - https://docs.google.com/document/d/{id}/...
 */
export function parseGoogleDriveUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const clean = rawUrl.trim();

  // Pattern 1: /file/d/{fileId}
  const fileDMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileDMatch) return fileDMatch[1];

  // Pattern 2: /document/d/{fileId}
  const docDMatch = clean.match(/\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (docDMatch) return docDMatch[1];

  // Pattern 3: id={fileId} query parameter
  const idQueryMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idQueryMatch) return idQueryMatch[1];

  // Pattern 4: Raw file ID (alphanumeric string with 25+ chars)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(clean)) {
    return clean;
  }

  return null;
}

export interface DriveDownloadResult {
  buffer: Buffer;
  fileName?: string;
  mimeType?: string;
}

/**
 * Downloads a publicly accessible Google Drive file using official Google Drive endpoints.
 * Throws a clear user-friendly error if the file is private or requires authentication.
 */
export async function downloadGoogleDriveFile(fileId: string): Promise<DriveDownloadResult> {
  const privateFileError = "The Google Drive file is private or inaccessible. Please ensure link sharing is set to 'Anyone with the link can view' and try again.";

  // Strategy 1: Official Google Drive REST API (if GEMINI_API_KEY / GOOGLE_API_KEY is available)
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
      const apiRes = await fetch(apiUrl, {
        headers: { 'User-Agent': 'EchoSphere-Hiring-Engine/1.0' },
        signal: AbortSignal.timeout(12000)
      });

      if (apiRes.ok) {
        const arrayBuffer = await apiRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Verify not an HTML error message
        const preview = buffer.subarray(0, 100).toString('utf-8');
        if (!preview.includes('<!DOCTYPE') && !preview.includes('<html')) {
          return {
            buffer,
            mimeType: apiRes.headers.get('content-type') || 'application/pdf'
          };
        }
      } else if (apiRes.status === 403 || apiRes.status === 401) {
        const errJson: any = await apiRes.json().catch(() => ({}));
        const reason = errJson?.error?.errors?.[0]?.reason || '';
        if (reason === 'cannotDownloadAbusiveFile' || reason === 'fileNotDownloadable') {
          // continue to fallback
        } else {
          const err: any = new Error(privateFileError);
          err.isPrivate = true;
          err.statusCode = 400;
          throw err;
        }
      } else if (apiRes.status === 404) {
        const err: any = new Error("Google Drive file not found. Please verify the URL.");
        err.statusCode = 404;
        throw err;
      }
    } catch (e: any) {
      if (e.isPrivate || e.statusCode === 404) throw e;
      // Continue to Strategy 2
    }
  }

  // Strategy 2: Direct accessible download via Google Drive uc export
  try {
    const ucUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const res = await fetch(ucUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });

    if (res.status === 404) {
      const err: any = new Error("Google Drive file not found. Please check the URL.");
      err.statusCode = 404;
      throw err;
    }

    if (res.status === 403 || res.status === 401) {
      const err: any = new Error(privateFileError);
      err.isPrivate = true;
      err.statusCode = 400;
      throw err;
    }

    const contentType = res.headers.get('content-type') || '';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if Google redirected to a login page or permission denied HTML page
    const sample = buffer.subarray(0, 500).toString('utf-8');
    if (contentType.includes('text/html') || sample.includes('<!DOCTYPE') || sample.includes('<html')) {
      if (
        sample.includes('Sign in') || 
        sample.includes('accounts.google.com') || 
        sample.includes('ServiceLogin') ||
        sample.includes('You need access') ||
        sample.includes('permission')
      ) {
        const err: any = new Error(privateFileError);
        err.isPrivate = true;
        err.statusCode = 400;
        throw err;
      }

      // Check for Google Drive virus scan warning for larger files
      const confirmMatch = sample.match(/confirm=([0-9A-Za-z_-]+)/i);
      if (confirmMatch) {
        const confirmToken = confirmMatch[1];
        const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;
        const confirmRes = await fetch(confirmUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          redirect: 'follow',
          signal: AbortSignal.timeout(15000)
        });
        if (confirmRes.ok) {
          const confBuf = Buffer.from(await confirmRes.arrayBuffer());
          return { buffer: confBuf, mimeType: confirmRes.headers.get('content-type') || 'application/pdf' };
        }
      }

      const err: any = new Error(privateFileError);
      err.isPrivate = true;
      err.statusCode = 400;
      throw err;
    }

    return {
      buffer,
      mimeType: contentType
    };
  } catch (err: any) {
    if (err.isPrivate || err.statusCode) throw err;
    throw new Error(`Failed to download Google Drive file: ${err.message}`);
  }
}

/**
 * Main Google Drive Resume Processor.
 * Validates link, downloads file, and extracts plain resume text.
 */
export async function extractResumeFromGoogleDrive(rawUrl: string): Promise<string> {
  const fileId = parseGoogleDriveUrl(rawUrl);
  if (!fileId) {
    const err: any = new Error("Invalid Google Drive URL. Please provide a standard shareable link (e.g. https://drive.google.com/file/d/.../view).");
    err.statusCode = 400;
    throw err;
  }

  const { buffer, mimeType } = await downloadGoogleDriveFile(fileId);

  // Verify that downloaded file has PDF signature (%PDF-)
  const magicBytes = buffer.subarray(0, 5).toString('ascii');
  if (magicBytes !== '%PDF-' && !mimeType?.includes('pdf')) {
    // If not standard PDF, check if it's plain text or throw clear error
    const preview = buffer.subarray(0, 100).toString('utf-8');
    if (!preview.includes('\x00')) {
      // It's readable text
      return buffer.toString('utf-8').trim();
    }
    const err: any = new Error("Unsupported file format in Google Drive. Please provide a PDF resume.");
    err.statusCode = 400;
    throw err;
  }

  return await extractTextFromPdfBuffer(buffer);
}
