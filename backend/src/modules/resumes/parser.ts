import pdfParse from "pdf-parse";

export interface ResumeParser { supports(mimeType: string): boolean; extractText(buffer: Buffer): Promise<string> }

export class PdfResumeParser implements ResumeParser {
  supports(mimeType: string) { return mimeType === "application/pdf"; }
  async extractText(buffer: Buffer) {
    const result = await pdfParse(buffer, { max: 50 });
    return result.text.replace(/\u0000/g, "").trim().slice(0, 120_000);
  }
}

export class PlainTextResumeParser implements ResumeParser {
  supports(mimeType: string) { return mimeType === "text/plain"; }
  async extractText(buffer: Buffer) { return buffer.toString("utf8").replace(/\u0000/g, "").trim().slice(0, 120_000); }
}

export class ResumeParserRegistry {
  private readonly parsers: ResumeParser[] = [new PdfResumeParser(), new PlainTextResumeParser()];
  supports(mimeType: string) { return this.parsers.some((parser) => parser.supports(mimeType)); }
  async extractText(mimeType: string, buffer: Buffer) {
    const parser = this.parsers.find((candidate) => candidate.supports(mimeType));
    if (!parser) throw new Error("No resume parser is configured for this file type.");
    return parser.extractText(buffer);
  }
}
