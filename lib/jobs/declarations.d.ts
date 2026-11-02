declare module 'mammoth' {
  export interface RawTextResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export function extractRawText(input: { buffer: Buffer }): Promise<RawTextResult>;
}

declare module 'pdf-parse' {
  export interface PDFParseOptions {
    data: Buffer | Uint8Array;
    verbosity?: number;
  }

  export interface PDFTextResult {
    total: number;
    text: string;
    pages: Array<{ text: string; num: number }>;
  }

  export class PDFParse {
    constructor(options: PDFParseOptions);
    getText(options?: any): Promise<PDFTextResult>;
    destroy(): Promise<void>;
  }
}
