import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { extractText, getDocumentProxy, getResolvedPDFJS } from "unpdf";

const PII_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // US phone: (555) 123-4567, 555-123-4567, 555.123.4567, +1 555 123 4567
  /(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  // International phone: +xx and digits
  /\+\d{1,3}[-.\s]?(?:\d[-.\s]?){8,}/g,
  // Plain 10-digit US number
  /\b\d{10}\b/g,
  // SSN
  /\d{3}-\d{2}-\d{4}/g,
  // Insurance / member IDs: letters + digits (e.g. WXY123456789, ABC123456)
  /\b[A-Z]{2,4}\d{6,12}\b/gi,
  // Insurance: digit blocks with dashes (e.g. 1234-567890-01)
  /\b\d{4}-\d{6,}-\d{2,4}\b/g,
];

function isPii(str: string): boolean {
  if (!str || str.length < 3) return false;
  return PII_PATTERNS.some((re) => {
    re.lastIndex = 0;
    return re.test(str);
  });
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text ?? "";
}

export function redactPii(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED]")
    .replace(/(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[REDACTED]")
    .replace(/\+\d{1,3}[-.\s]?(?:\d[-.\s]?){8,}/g, "[REDACTED]")
    .replace(/\b\d{10}\b/g, "[REDACTED]")
    .replace(/\d{3}-\d{2}-\d{4}/g, "[REDACTED]")
    .replace(/\b[A-Z]{2,4}\d{6,12}\b/gi, "[REDACTED]")
    .replace(/\b\d{4}-\d{6,}-\d{2,4}\b/g, "[REDACTED]");
}

const LINE_HEIGHT = 14;
const MARGIN = 50;
const FONT_SIZE = 11;
const CHARS_PER_LINE = 85;

export async function textToPdf(text: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const lines: string[] = [];
  for (const paragraph of text.split(/\n\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length > CHARS_PER_LINE && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    lines.push("");
  }

  let page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();
  let y = height - MARGIN;

  for (const line of lines) {
    if (y < MARGIN) {
      page = doc.addPage([612, 792]);
      y = page.getSize().height - MARGIN;
    }
    page.drawText(line, {
      x: MARGIN,
      y,
      size: FONT_SIZE,
      font,
    });
    y -= LINE_HEIGHT;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export type RedactionRect = { pageIndex: number; x: number; y: number; width: number; height: number };

type TextItem = { str: string; transform: number[]; width?: number; height?: number };

export async function redactPiiInPdf(buffer: Buffer): Promise<Buffer> {
  const pdfjs = await getResolvedPDFJS();
  const { getDocument } = pdfjs;
  const doc = await getDocument(new Uint8Array(buffer)).promise;
  const numPages = doc.numPages;
  const rects: RedactionRect[] = [];

  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    const items = textContent.items as TextItem[];

    for (const item of items) {
      const str = item.str;
      if (!str || !isPii(str)) continue;

      const transform = item.transform;
      if (!transform || transform.length < 6) continue;

      const x = transform[4];
      const y = transform[5];
      const w = item.width ?? Math.max(20, str.length * 7);
      const h = item.height ?? 14;

      rects.push({
        pageIndex: p - 1,
        x: Math.max(0, x - 1),
        y: Math.max(0, y - 1),
        width: w + 2,
        height: h + 2,
      });
    }
  }

  await doc.destroy();

  if (rects.length === 0) {
    const text = await extractTextFromPdf(buffer);
    const redacted = redactPii(text);
    if (redacted !== text) {
      return textToPdf(redacted);
    }
  }

  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  for (const rect of rects) {
    const page = pages[rect.pageIndex];
    if (!page) continue;

    const { width: pageW, height: pageH } = page.getSize();
    const x = Math.max(0, Math.min(rect.x, pageW - 10));
    const y = Math.max(0, Math.min(rect.y, pageH - 10));
    const w = Math.min(rect.width, pageW - x);
    const h = Math.min(rect.height, pageH - y);

    if (w > 0 && h > 0) {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: rgb(0, 0, 0),
      });
    }
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
