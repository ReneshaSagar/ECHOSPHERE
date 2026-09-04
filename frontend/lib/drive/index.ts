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
 * Downloads a publicly accessible Google Drive file using official Google Drive content endpoints.
 * Reliably handles public share links, large file virus warnings, and Google Doc formats.
 * Throws a clear user-friendly error if the file is truly private or requires authentication.
 */
export async function downloadGoogleDriveFile(fileId: string): Promise<DriveDownloadResult> {
  const privateFileError = "The Google Drive file is private or inaccessible. Please ensure link sharing is set to 'Anyone with the link can view' and try again.";

  // Candidate download endpoints in order of delivery speed and reliability
  const candidateEndpoints = [
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://docs.google.com/document/d/${fileId}/export?format=pdf`
  ];

  let isPrivateDetected = false;
  let isNotFoundDetected = false;

  for (const endpoint of candidateEndpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000)
      });

      if (res.status === 404) {
        isNotFoundDetected = true;
        continue;
      }

      if (res.status === 401 || res.status === 403) {
        isPrivateDetected = true;
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) continue;

      const preview = buffer.subarray(0, 1000).toString('utf-8');
      const isHtml = contentType.includes('text/html') || preview.includes('<!DOCTYPE') || preview.includes('<html');

      if (!isHtml) {
        // Binary payload received (e.g. PDF or document stream)
        return {
          buffer,
          mimeType: contentType || 'application/pdf'
        };
      }

      // If response is HTML, inspect content
      // 1. Check if Google returned a large file virus scan confirmation token
      const confirmMatch = preview.match(/confirm=([0-9A-Za-z_-]+)/i) || preview.match(/name="confirm"\s+value="([0-9A-Za-z_-]+)"/i);
      if (confirmMatch) {
        const token = confirmMatch[1];
        const confirmUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${token}&authuser=0`;
        const confirmRes = await fetch(confirmUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(15000)
        });

        if (confirmRes.ok) {
          const confBuf = Buffer.from(await confirmRes.arrayBuffer());
          const confPreview = confBuf.subarray(0, 100).toString('utf-8');
          if (!confPreview.includes('<html') && !confPreview.includes('<!DOCTYPE')) {
            return {
              buffer: confBuf,
              mimeType: confirmRes.headers.get('content-type') || 'application/pdf'
            };
          }
        }
      }

      // 2. Check if the page is a Google sign-in or permission denied prompt
      if (
        preview.includes('accounts.google.com') ||
        preview.includes('ServiceLogin') ||
        preview.includes('Sign in') ||
        preview.includes('You need access') ||
        preview.includes('You need permission') ||
        preview.includes('Request access') ||
        preview.includes('Access denied')
      ) {
        isPrivateDetected = true;
        continue;
      }

      // 3. Check for 404 in HTML
      if (preview.includes('Error 404 (Not Found)')) {
        isNotFoundDetected = true;
        continue;
      }
    } catch (fetchErr: any) {
      console.warn(`[Google Drive] Attempt on ${endpoint} encountered:`, fetchErr.message);
    }
  }

  if (isNotFoundDetected && !isPrivateDetected) {
    const err: any = new Error("Google Drive file not found. Please verify the URL.");
    err.statusCode = 404;
    throw err;
  }

  // Default to private/inaccessible error
  const err: any = new Error(privateFileError);
  err.isPrivate = true;
  err.statusCode = 400;
  throw err;
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
