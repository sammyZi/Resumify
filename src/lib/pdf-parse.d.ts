declare module 'pdf-parse' {
  interface PdfParseResult {
    /** Total number of pages */
    numpages: number
    /** Total number of rendered pages (may differ from numpages) */
    numrender: number
    /** PDF.js version used */
    version: string
    /** Extracted text content from all pages */
    text: string
    /** PDF metadata info */
    info: Record<string, unknown>
    /** PDF metadata */
    metadata: unknown
  }

  function pdfParse(
    dataBuffer: Buffer | ArrayBuffer,
    options?: Record<string, unknown>
  ): Promise<PdfParseResult>

  export default pdfParse
}
