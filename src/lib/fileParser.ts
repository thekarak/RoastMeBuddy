import type { Buffer } from "buffer";

export async function parsePDF(buffer: Buffer): Promise<string> {
  const PDFParser = (await import("pdf2json")).default;

  return new Promise<string>((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (errData: Error | { parserError: Error }) => {
      reject(errData instanceof Error ? errData : errData.parserError);
    });

    parser.on("pdfParser_dataReady", (pdfData: { Pages?: { Texts?: { R?: { T?: string }[] }[] }[] }) => {
      const pages: string[] = [];
      if (pdfData.Pages) {
        for (const page of pdfData.Pages) {
          const texts: string[] = [];
          if (page.Texts) {
            for (const text of page.Texts) {
              if (text.R) {
                for (const r of text.R) {
                  if (r.T) {
                    try { texts.push(decodeURIComponent(r.T)); } catch { texts.push(r.T); }
                  }
                }
              }
            }
          }
          pages.push(texts.join(" "));
        }
      }
      resolve(pages.join("\n\n"));
    });

    parser.parseBuffer(buffer);
  });
}

export async function parseDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") return parsePDF(buffer);
  if (ext === "docx") return parseDOCX(buffer);
  throw new Error(`Unsupported file type: .${ext}. Only PDF and DOCX are supported.`);
}
