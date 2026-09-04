/**
 * Extracts plain text from a PDF Buffer with whitespace normalization.
 * Uses pdf-parse/lib/pdf-parse.js directly to avoid Next.js bundling issues.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF file buffer is empty.');
  }

  try {
    // @ts-ignore
    const pdfParse = typeof require !== 'undefined' ? require('pdf-parse/lib/pdf-parse.js') : (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    const rawText = data?.text || '';

    const cleaned = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    if (!cleaned || cleaned.length < 5) {
      throw new Error('The PDF document contains insufficient readable text. Please upload a searchable text PDF.');
    }

    return cleaned;
  } catch (err: any) {
    console.error('[Resume Extraction] PDF parse error:', err.message);
    throw new Error(`Failed to extract text from PDF: ${err.message}`);
  }
}
