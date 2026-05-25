const { PDFDocument: PdfLibDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const { generateFileName } = require('../utils/helpers');
const PdfDocument = require('../models/PdfDocument');
const nlpEnhancer = require('../services/nlpEnhancerService');
const commandSuggestion = require('../services/commandSuggestionService');
const executionSafety = require('../services/executionSafetyService');
const pdfEngine = require('../services/pdfActionEngine');
const jobQueue = require('../services/jobQueueService');
const docClassifier = require('../services/docClassifierService');
const ollamaService = require('../services/ollamaService');

/**
 * Merges multiple native PDF files into a single PDF.
 * Expects an array of uploaded files (PDFs) from multer.
 * Returns JSON with download URL instead of direct download for better mobile support.
 */
exports.mergePdfs = async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ msg: 'Please upload at least 2 PDF files to merge.' });
    }

    // Create a new blank PDF
    const mergedPdf = await PdfLibDocument.create();

    // Iterate through uploaded files and merge them
    for (const file of req.files) {
      // Read the PDF file into a buffer
      const fileBuffer = await fs.readFile(file.path);
      
      // Load the PDF using pdf-lib
      const pdfToMerge = await PdfLibDocument.load(fileBuffer);
      
      // Copy all pages from the current PDF
      const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
      
      // Add each copied page to the new document
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
      
      // Cleanup the temporary uploaded file asynchronously (no need to await)
      fs.unlink(file.path).catch(err => console.error(`Failed to delete temp file ${file.path}:`, err));
    }

    // Serialize the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    
    // Save the merged PDF to uploads
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));
    const outputFilename = `merged_${generateFileName('output.pdf')}`;
    const outputPath = path.join(uploadDir, outputFilename);
    
    await fs.writeFile(outputPath, mergedPdfBytes);

    // Save to Database
    const newPdfDoc = new PdfDocument({
      user: req.user ? req.user._id : '000000000000000000000000',
      originalFilename: 'Merged_Document.pdf',
      currentFilename: outputFilename,
      filepath: `/uploads/${outputFilename}`,
      size: mergedPdfBytes.length,
      numPages: mergedPdf.getPageCount(),
      history: [{ action: 'MERGE', description: `Merged ${req.files.length} files.` }]
    });
    await newPdfDoc.save();

    // Return JSON response with download URL for better mobile compatibility
    const downloadUrl = `/uploads/${outputFilename}`;
    res.status(200).json({
      success: true,
      msg: 'PDFs merged successfully',
      downloadUrl,
      filename: 'Merged_Document.pdf',
      pages: mergedPdf.getPageCount(),
      size: mergedPdfBytes.length
    });

  } catch (error) {
    console.error('PDF Merge Error:', error);
    res.status(500).json({ msg: 'An error occurred while merging the PDFs.' });
  }
};