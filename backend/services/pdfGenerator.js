const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));

function toAbsolute(url) {
  if (!url) return '';
  if (path.isAbsolute(url)) return url;
  const rel = url.replace(/^uploads\//, '');
  return path.join(UPLOAD_DIR, rel);
}

/**
 * Generate a PDF from an array of page objects.
 * Each page must have processedImage or originalImage pointing to an existing file.
 */
exports.generatePdf = async (pages, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const { title = 'Document', quality = 'standard', password = null } = options;
      const outputDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const safeTitle = (title || 'Document')
        .replace(/[^a-zA-Z0-9_\-\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 60) || 'Document';

      const pdfPath = path.join(outputDir, `${Date.now()}_${safeTitle}.pdf`);

      const pdfOptions = {
        autoFirstPage: false,
        size: 'A4',
        margins: { top: 20, bottom: 20, left: 20, right: 20 }
      };

      if (password) {
        pdfOptions.userPassword = password;
        pdfOptions.ownerPassword = password;
        pdfOptions.permissions = {
          printing: 'highResolution',
          modifying: false,
          copying: false
        };
      }

      const doc = new PDFDocument(pdfOptions);

      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      let pagesAdded = 0;

      for (const page of pages) {
        let imagePath = toAbsolute(page.processedImage || page.originalImage);

        if (!imagePath || !fs.existsSync(imagePath)) {
          console.warn(`[PDF] Skipping page ${page.pageNumber} - file not found: ${imagePath}`);
          continue;
        }

        // Validate that it's a readable image
        let img;
        try {
          img = doc.openImage(imagePath);
        } catch (imgErr) {
          console.warn(`[PDF] Could not open image ${imagePath}:`, imgErr.message);
          continue;
        }

        if (!img || !img.width || !img.height) {
          console.warn(`[PDF] Invalid image dimensions for page ${page.pageNumber}`);
          continue;
        }

        // Add a new A4 page
        doc.addPage({ size: 'A4', margins: { top: 20, bottom: 20, left: 20, right: 20 } });

        const pageW = doc.page.width;
        const pageH = doc.page.height;
        const margin = 20;
        const usableW = pageW - margin * 2;
        const usableH = pageH - margin * 2;

        // Scale image to fit page while maintaining aspect ratio
        const scaleX = usableW / img.width;
        const scaleY = usableH / img.height;
        const scale = Math.min(scaleX, scaleY, 1); // never upscale beyond 100%

        const finalW = Math.round(img.width * scale);
        const finalH = Math.round(img.height * scale);

        // Center image on page
        const x = margin + (usableW - finalW) / 2;
        const y = margin + (usableH - finalH) / 2;

        // Apply rotation if needed
        if (page.rotation && page.rotation !== 0) {
          doc.save();
          const cx = x + finalW / 2;
          const cy = y + finalH / 2;
          doc.translate(cx, cy).rotate(page.rotation).translate(-cx, -cy);
          doc.image(imagePath, x, y, { width: finalW, height: finalH });
          doc.restore();
        } else {
          doc.image(imagePath, x, y, { width: finalW, height: finalH });
        }

        pagesAdded++;
      }

      if (pagesAdded === 0) {
        doc.addPage();
        doc.fontSize(14).fillColor('#666').text('No valid pages found in this document.', 40, 40);
      }

      doc.end();

      writeStream.on('finish', () => {
        console.log(`[PDF] Generated: ${pdfPath} (${pagesAdded} pages)`);
        resolve(pdfPath);
      });

      writeStream.on('error', (err) => {
        console.error('[PDF] Write stream error:', err);
        reject(err);
      });

    } catch (err) {
      console.error('[PDF] Generation error:', err);
      reject(err);
    }
  });
};

/**
 * Compress a PDF (placeholder - copies file)
 */
exports.compressPdf = async (pdfPath) => {
  try {
    if (!fs.existsSync(pdfPath)) return pdfPath;
    const stat = fs.statSync(pdfPath);
    if (stat.size < 500000) return pdfPath; // already small
    const compressedPath = pdfPath.replace('.pdf', '_compressed.pdf');
    fs.copyFileSync(pdfPath, compressedPath);
    return compressedPath;
  } catch (err) {
    console.error('[PDF] Compress error:', err);
    return pdfPath;
  }
};
