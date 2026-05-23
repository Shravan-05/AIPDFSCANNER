const { PDFDocument } = require('pdf-lib');

class DocClassifierService {
  /**
   * Extracts sample text from the first few pages of a PDF buffer
   */
  async extractSampleText(pdfBuffer) {
    let text = '';
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const pagesToScan = pages.slice(0, 3); // Check first 3 pages

      for (const page of pagesToScan) {
        const streams = page.node.getContents();
        if (!streams) continue;
        for (const s of streams) {
          if (!s || !s.contents) continue;
          const streamText = s.contents.toString();
          
          // Regex to extract text blocks enclosed in parenthesis (e.g., (Sample Text) Tj)
          const matches = streamText.match(/\(([^)]+)\)/g);
          if (matches) {
            text += ' ' + matches.map(m => m.slice(1, -1)).join(' ');
          }
        }
      }
    } catch (err) {
      console.error('Error extracting sample text for classification:', err);
    }
    return text.toLowerCase();
  }

  /**
   * Classifies a document buffer and generates smart contextual suggestions
   */
  async classify(pdfBuffer) {
    const text = await this.extractSampleText(pdfBuffer);
    
    const keywords = {
      invoice: ['invoice', 'billing', 'bill to', 'due date', 'total due', 'invoice number', 'remit', 'amount due', 'tax invoice', 'payment due'],
      resume: ['resume', 'curriculum vitae', 'experience', 'education', 'skills', 'employment', 'achievements', 'certifications', 'hobbies'],
      contract: ['contract', 'agreement', 'hereby agreed', 'parties', 'terms and conditions', 'signatory', 'witnesseth', 'indemnification', 'confidentiality'],
      receipt: ['receipt', 'cashier', 'subtotal', 'sales tax', 'terminal', 'change due', 'payment method', 'merchant', 'receipt total'],
      form: ['application', 'first name', 'last name', 'date of birth', 'signature', 'checkbox', 'please fill', 'official use only'],
      notes: ['lecture notes', 'summary', 'meeting notes', 'objectives', 'chapter', 'draft', 'outline', 'agenda'],
      book: ['chapter', 'isbn', 'publisher', 'copyright', 'preface', 'table of contents', 'bibliography', 'edition']
    };

    let detectedClass = text.trim().length < 30 ? 'scan' : 'document';
    let maxMatches = 0;

    for (const [docClass, words] of Object.entries(keywords)) {
      let matches = 0;
      for (const word of words) {
        if (text.includes(word)) {
          matches++;
        }
      }
      // Require at least 2 distinct keyword hits for a match
      if (matches > maxMatches && matches >= 2) {
        maxMatches = matches;
        detectedClass = docClass;
      }
    }

    // Define beautiful custom action cards for each class
    const suggestions = {
      invoice: [
        { label: '\u{1F4CA} Summarize Expenses', command: 'extract total amount and summarize expenses' },
        { label: '\u{1F512} Stamp as PAID', command: "stamp 'PAID' on top of page 1" },
        { label: '\u{1F5DC}\uFE0F Compress PDF', command: 'compress this file' }
      ],
      resume: [
        { label: '\u{1F4DD} Extract Contact Info', command: 'extract email and phone number' },
        { label: '\u{1F464} Professional Summary', command: 'generate a professional summary' },
        { label: '\u{1F504} Rotate 90\u00B0', command: 'rotate all pages 90 degrees' }
      ],
      contract: [
        { label: '\u{1F50D} Find Key Clauses', command: 'extract key clauses and dates' },
        { label: '\u{270D}\uFE0F Stamp SIGNED', command: "stamp 'SIGNED' on top of page 1" },
        { label: '\u{1F4A7} Add Watermark', command: "watermark saying 'CONFIDENTIAL'" }
      ],
      receipt: [
        { label: '\u{1F4B0} Summarize Receipt', command: 'extract totals and dates' },
        { label: '\u{1F5DC}\uFE0F Compress PDF', command: 'compress to smallest size' }
      ],
      form: [
        { label: '\u{270D}\uFE0F Stamp APPROVED', command: "stamp 'APPROVED' on top of page 1" },
        { label: '\u{2702}\uFE0F Split in half', command: 'split in half' }
      ],
      notes: [
        { label: '\u{1F4DD} Summarize Notes', command: 'summarize notes' },
        { label: '\u{1F5D1}\uFE0F Clean Blank Pages', command: 'remove blank pages' }
      ],
      scan: [
        { label: '\u{1F50D} Clean Scan', command: 'make it readable' },
        { label: '\u{1F524} OCR Text', command: 'ocr this document' },
        { label: '\u{1F504} Rotate Pages', command: 'rotate all pages 90 degrees' }
      ],
      book: [
        { label: '\u{1F4D6} Summarize Chapter', command: 'summarize this document' },
        { label: '\u{1F50D} Make Searchable', command: 'ocr this document' },
        { label: '\u{1F5DC}\uFE0F Compress PDF', command: 'compress this file' }
      ],
      document: [
        { label: '\u{1F5DC}\uFE0F Make smaller', command: 'compress this file' },
        { label: '\u{1F4A7} Add Watermark', command: "watermark saying 'DRAFT'" },
        { label: '\u{1F5D1}\uFE0F Remove Blank Pages', command: 'remove blank pages' }
      ]
    };

    return {
      type: detectedClass,
      suggestions: suggestions[detectedClass] || suggestions.document
    };
  }
}

module.exports = new DocClassifierService();
