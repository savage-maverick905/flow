import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

// The legacy build runs on older Android WebViews. Both files are bundled locally.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface Extracted {
  text: string;
  pageStarts: number[];
  pages: number;
  count: number;
}

export async function extractPdf(file: File, onProgress: (p: number) => void): Promise<Extracted> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const words: string[] = [];
  const pageStarts: number[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let s = '';
    for (const it of content.items) {
      if (!('str' in it)) continue;
      s += it.str;
      if (it.hasEOL) s += /\p{L}-$/u.test(s) ? '' : ' '; // rejoin hyphenated line breaks
    }
    pageStarts.push(words.length);
    for (const w of s.split(/\s+/)) if (w) words.push(w);
    page.cleanup();
    onProgress(p / pdf.numPages);
    if (p % 4 === 0) await new Promise((r) => setTimeout(r));
  }
  const pages = pdf.numPages;
  await pdf.destroy();
  return { text: words.join(' '), pageStarts, pages, count: words.length };
}
