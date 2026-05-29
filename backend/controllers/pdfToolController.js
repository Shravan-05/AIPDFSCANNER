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
      user: req.user ? req.user._id : '000000000000000000000000', // Default if auth is loose
      originalFilename: 'Merged_Document.pdf',
      currentFilename: outputFilename,
      filepath: `/uploads/${outputFilename}`,
      size: mergedPdfBytes.length,
      numPages: mergedPdf.getPageCount(),
      history: [{ action: 'MERGE', description: `Merged ${req.files.length} files.` }]
    });
    await newPdfDoc.save();

    // Send the file to the client without deleting it from the server
    res.download(outputPath, 'Merged_Document.pdf');

  } catch (error) {
    console.error('PDF Merge Error:', error);
    res.status(500).json({ msg: 'An error occurred while merging the PDFs.' });
  }
};

/**
 * AI-powered PDF Editing (Enhanced with NLP & Safety)
 */
exports.aiEdit = async (req, res) => {
  try {
    const { command, input_mode, history: historyStr, doc_info: docInfoStr } = req.body;
    if (!req.file || !command) {
      return res.status(400).json({ msg: 'Missing file or natural language command.' });
    }

    // Parse history if present
    let history = [];
    if (historyStr) {
      try {
        history = JSON.parse(historyStr);
      } catch (e) {
        console.error('Error parsing history context:', e);
      }
    }

    // Parse document info if present
    let docInfo = {};
    if (docInfoStr) {
      try {
        docInfo = JSON.parse(docInfoStr);
      } catch (e) {
        console.error('Error parsing doc info:', e);
      }
    }

    const inputMode = input_mode || 'text';
    const cacheKey = nlpEnhancer.normalizeForCache(command);
    const fileBuffer = await fs.readFile(req.file.path);
    let pageCount = docInfo.pageCount || 0;
    if (!pageCount) {
      try {
        const loadedPdf = await PdfLibDocument.load(fileBuffer);
        pageCount = loadedPdf.getPageCount();
      } catch (e) {
        console.error('Unable to read PDF page count for validation:', e.message);
      }
    }

    // 0. Pre-process with NLP enhancer for quick optimization
    const preprocessed = await nlpEnhancer.preprocessCommand(command);
    
    // Check cache for common commands
    let cachedResult = nlpEnhancer.cloneParse(nlpEnhancer.getCachedParse(cacheKey));

    // Quick intent match for very clear commands
    const quickMatch = nlpEnhancer.quickIntentMatch(command);

    // 1. Parse natural language into JSON actions
    let parseResult;
    
    if (cachedResult && cachedResult.confidence >= 0.85) {
      parseResult = cachedResult;
    } else {
      const ollamaResult = await ollamaService.parsePdfCommand(command, {
        pageCount,
        documentType: docInfo.documentType || 'document'
      });

      parseResult = ollamaResult;
    }
    parseResult.original_input = command;
    parseResult.input_mode = inputMode;

    // 2. Enhance confidence with additional NLP analysis
    const confidenceMultiplier = nlpEnhancer.calculateConfidenceMultiplier(
      command,
      parseResult.intent,
      parseResult.confidence
    );
    parseResult.confidence = Math.min(0.98, parseResult.confidence * confidenceMultiplier);

    // 3. Validate action sequence

    const pdfMetadata = {
      fileSizeMB: req.file.size / (1024 * 1024),
      pageCount,
      isEncrypted: docInfo.isEncrypted || false,
      documentType: docInfo.documentType || 'document'
    };

    if (preprocessed.inputType === 'question' && parseResult.confidence < 0.7) {
      fs.unlink(req.file.path).catch(e => console.error(e));
      return res.status(200).json({
        success: true,
        clarification: true,
        msg: parseResult.clarification_question || 'I can help execute PDF edits. Tell me the action you want me to perform.',
        intent: parseResult.intent,
        confidence: parseResult.confidence,
        entities: parseResult.entities
      });
    }

    const validation = executionSafety.validateActionSequence(parseResult.actions || [], pdfMetadata);
    if (!validation.isValid) {
      fs.unlink(req.file.path).catch(e => console.error(e));
      return res.status(400).json({
        success: false,
        msg: validation.errors[0],
        errors: validation.errors,
        intent: parseResult.intent,
        confidence: parseResult.confidence
      });
    }

    // 4. Handle clarification needs
    if (parseResult.needs_clarification) {
      fs.unlink(req.file.path).catch(e => console.error(e));
      return res.status(200).json({
        success: true,
        clarification: true,
        msg: parseResult.clarification_question,
        intent: parseResult.intent,
        confidence: parseResult.confidence,
        entities: parseResult.entities
      });
    }

    // 5. Generate smart suggestions if available
    const suggestions = commandSuggestion.generateContextualSuggestions({
      fileSize: req.file.size,
      isScanned: docInfo.isScanned || false,
      documentType: pdfMetadata.documentType,
      uploadedFileCount: 1
    });

    // 6. Cache successful parse for future quick matching
    nlpEnhancer.setCachedParse(cacheKey, nlpEnhancer.cloneParse(parseResult));

    // 7. Finalize and enqueue
    return finalizeParse(req, res, parseResult, inputMode, suggestions, validation);

  } catch (error) {
    console.error('AI Edit Error:', error);
    if (req.file) fs.unlink(req.file.path).catch(e => console.error(e));
    res.status(500).json({ msg: 'An error occurred while editing the PDF.' });
  }
};

/**
 * Helper: Finalize parse and enqueue job
 */
async function finalizeParse(req, res, parseResult, inputMode, suggestions = [], validation = {}) {
  // Check for workspace redirect commands
  const redirectAction = parseResult.actions?.find(act => act.type === 'REDIRECT');
  if (redirectAction) {
    fs.unlink(req.file.path).catch(e => console.error(e));
    return res.status(200).json({
      success: true,
      redirect: true,
      target: redirectAction.target,
      msg: redirectAction.target === 'scanner' ? 'Redirecting you to the Scanner Workspace...' : 'Switching you to the Document Editor...',
      intent: parseResult.intent,
      confidence: parseResult.confidence,
      entities: parseResult.entities
    });
  }

  if (!parseResult.actions || parseResult.actions.length === 0) {
    fs.unlink(req.file.path).catch(e => console.error(e));
    return res.status(400).json({ msg: parseResult.msg || "Could not parse command." });
  }

  // Check if confirmation needed for destructive actions
  if (validation.requiresConfirmation) {
    fs.unlink(req.file.path).catch(e => console.error(e));
    return res.status(200).json({
      success: true,
      needs_confirmation: true,
      confirmation_message: validation.confirmationMessage,
      intent: parseResult.intent,
      confidence: parseResult.confidence,
      actions: parseResult.actions,
      entities: parseResult.entities
    });
  }

  // Enqueue the PDF actions in background job processing queue
  const jobId = await jobQueue.createJob(
    req.user ? req.user._id : '000000000000000000000000',
    req.file.originalname,
    req.file.path,
    parseResult.actions,
    parseResult.original_input
  );

  // Return with suggestions and metadata
  return res.status(200).json({
    success: true,
    msg: 'PDF job enqueued successfully.',
    jobId,
    intent: parseResult.intent,
    confidence: parseResult.confidence,
    entities: parseResult.entities,
    actions: parseResult.actions,
    input_mode: inputMode,
    suggestions: suggestions.slice(0, 4), // Top 4 suggestions
    warnings: validation.warnings || []
  });
}

/**
 * Returns the status and progress of a background PDF processing job
 */
exports.getJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await jobQueue.getJob(id);
    if (!job) {
      return res.status(404).json({ msg: 'Job not found' });
    }

    res.status(200).json({
      success: true,
      id: job.id,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      timeline: job.timeline,
      result: job.result,
      error: job.error
    });
  } catch (error) {
    console.error('Get Job Status Error:', error);
    res.status(500).json({ msg: 'An error occurred while fetching job status.' });
  }
};

/**
 * Rapidly classifies an uploaded PDF document using local heuristics
 */
exports.analyzePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'Missing file to analyze.' });
    }

    const pdfBuffer = await fs.readFile(req.file.path);
    const classification = await docClassifier.classify(pdfBuffer);

    // Clean up temporary uploads
    fs.unlink(req.file.path).catch(e => console.error(e));

    res.status(200).json({
      success: true,
      classification
    });
  } catch (error) {
    console.error('Analyze PDF Error:', error);
    if (req.file) fs.unlink(req.file.path).catch(e => console.error(e));
    res.status(500).json({ msg: 'An error occurred while analyzing the PDF.' });
  }
};

/**
 * Get smart suggestions based on document type and context
 */
exports.getSmartSuggestions = async (req, res) => {
  try {
    const { documentType, fileSize, pageCount, hasBlankPages, isScanned } = req.body;

    const suggestions = commandSuggestion.generateContextualSuggestions({
      documentType: documentType || 'document',
      fileSize: fileSize || 0,
      pageCount: pageCount || 0,
      hasBlankPages: hasBlankPages || false,
      isScanned: isScanned || false,
      uploadedFileCount: 1
    });

    res.status(200).json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Get Smart Suggestions Error:', error);
    res.status(500).json({ msg: 'An error occurred while generating suggestions.' });
  }
};

/**
 * Get command help text
 */
exports.getCommandHelp = async (req, res) => {
  try {
    const { command } = req.query;

    if (!command) {
      return res.status(400).json({ msg: 'Command parameter required' });
    }

    const help = commandSuggestion.getCommandHelp(command);
    const related = commandSuggestion.suggestRelatedCommands(command);

    res.status(200).json({
      success: true,
      command,
      help,
      relatedCommands: related
    });
  } catch (error) {
    console.error('Get Command Help Error:', error);
    res.status(500).json({ msg: 'An error occurred while fetching command help.' });
  }
};

/**
 * Get onboarding suggestions for new users
 */
exports.getOnboardingSuggestions = async (req, res) => {
  try {
    const suggestions = commandSuggestion.getOnboardingSuggestions();
    const workflows = commandSuggestion.getQuickstartWorkflows();

    res.status(200).json({
      success: true,
      suggestions,
      workflows
    });
  } catch (error) {
    console.error('Get Onboarding Suggestions Error:', error);
    res.status(500).json({ msg: 'An error occurred while fetching suggestions.' });
  }
};

/**
 * Validate action before execution
 */
exports.validateAction = async (req, res) => {
  try {
    const { action, pdfMetadata } = req.body;

    if (!action) {
      return res.status(400).json({ msg: 'Action parameter required' });
    }

    const validation = executionSafety.validateAction(action, pdfMetadata || {});

    let response = {
      success: true,
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: []
    };

    if (!validation.isValid) {
      response.warnings = [];
    }

    // Check if destructive
    if (executionSafety.isDestructiveAction(action.type)) {
      response.isDestructive = true;
      response.warning = executionSafety.getDestructiveActionWarning(action, pdfMetadata || {});
    }

    // Estimate processing time
    const estimatedTime = executionSafety.estimateProcessingTime(action, pdfMetadata || {});
    response.estimatedTimeMs = estimatedTime;
    response.shouldWarnAboutTime = executionSafety.shouldWarnAboutProcessingTime(estimatedTime);

    res.status(200).json(response);
  } catch (error) {
    console.error('Validate Action Error:', error);
    res.status(500).json({ msg: 'An error occurred while validating the action.' });
  }
};

/**
 * Test NLP parser status
 */
exports.testOllamaConnection = async (req, res) => {
  try {
    const result = await ollamaService.testConnection();
    res.status(result.success ? 200 : 503).json(result);
  } catch (error) {
    console.error('Ollama Connection Test Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      note: 'Local NLP parser is active and does not require Ollama'
    });
  }
};;
