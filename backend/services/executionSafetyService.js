/**
 * Execution Safety Service
 * Validates actions before execution, provides error recovery, and handles edge cases
 */

class ExecutionSafetyService {
  constructor() {
    this.executionHistory = new Map();
    this.MAX_HISTORY_SIZE = 1000;
    this.maxRetries = 3;
    this.retryDelayMs = 500;
  }

  /**
   * Validate action parameters before execution
   * Returns { isValid: boolean, errors: string[] }
   */
  validateAction(action, pdfMetadata) {
    const errors = [];

    if (!action || !action.type) {
      errors.push('Action must have a type');
      return { isValid: false, errors };
    }

    // Get validators for specific action types
    const validator = this.getValidatorForAction(action.type);
    if (validator) {
      const validationResult = validator.call(this, action, pdfMetadata);
      if (!validationResult.isValid) {
        errors.push(...validationResult.errors);
      }
    }

    return { 
      isValid: errors.length === 0, 
      errors 
    };
  }

  /**
   * Get validator function for action type
   */
  getValidatorForAction(actionType) {
    const validators = {
      'DELETE_PAGES': this.validateDeletePages,
      'DELETE_BLANK_PAGES': this.validateDeleteBlankPages,
      'ROTATE_PAGES': this.validateRotatePages,
      'EXTRACT_PAGES': this.validateExtractPages,
      'COMPRESS': this.validateCompress,
      'ADD_WATERMARK': this.validateAddWatermark,
      'ADD_TEXT': this.validateAddText,
      'REDACT_TEXT': this.validateRedactText,
      'CROP_PAGES': this.validateCropPages,
      'DUPLICATE_PAGES': this.validateDuplicatePages,
      'ENCRYPT_PDF': this.validateEncryptPDF,
      'UNLOCK_PDF': this.validateUnlockPDF
    };

    return validators[actionType];
  }

  /**
   * Validate DELETE_PAGES action
   */
  validateDeletePages(action, metadata) {
    const errors = [];
    const params = action.parameters || {};
    const pages = params.pages;

    if (!pages) {
      errors.push('No pages specified for deletion');
      return { isValid: false, errors };
    }

    const totalPages = metadata?.pageCount || 0;

    // Don't allow deleting all pages
    if (pages === 'all' && totalPages > 0) {
      errors.push('Cannot delete all pages. A PDF must contain at least one page.');
    }

    // Validate specific page numbers
    if (Array.isArray(pages)) {
      const invalidPages = pages.filter(p => p <= 0 || p > totalPages);
      if (invalidPages.length > 0) {
        errors.push(`Invalid page numbers: ${invalidPages.join(', ')}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate DELETE_BLANK_PAGES action
   */
  validateDeleteBlankPages(action, metadata) {
    const errors = [];
    const totalPages = metadata?.pageCount || 0;

    if (totalPages <= 1) {
      errors.push('PDF has only one page. Blank page deletion not applicable.');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate ROTATE_PAGES action
   */
  validateRotatePages(action, metadata) {
    const errors = [];
    const params = action.parameters || {};
    const degree = params.degree;

    if (!degree || ![0, 90, 180, 270, 360].includes(degree)) {
      errors.push(`Invalid rotation degree: ${degree}. Must be 0, 90, 180, or 270.`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate EXTRACT_PAGES action
   */
  validateExtractPages(action, metadata) {
    const errors = [];
    const params = action.parameters || {};
    const pages = params.pages || [];

    if (!Array.isArray(pages) || pages.length === 0) {
      errors.push('No pages specified for extraction');
      return { isValid: false, errors };
    }

    const totalPages = metadata?.pageCount || 0;
    const invalidPages = pages.filter(p => p <= 0 || p > totalPages);
    if (invalidPages.length > 0) {
      errors.push(`Invalid page numbers: ${invalidPages.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate COMPRESS action
   */
  validateCompress(action, metadata) {
    const errors = [];
    const params = action.parameters || {};
    const maxSize = params.maxSize;
    const sizeUnit = params.sizeUnit;

    if (maxSize && maxSize <= 0) {
      errors.push('Maximum file size must be positive');
    }

    if (sizeUnit && !['mb', 'kb', 'gb'].includes(sizeUnit.toLowerCase())) {
      errors.push(`Invalid size unit: ${sizeUnit}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate ADD_WATERMARK action
   */
  validateAddWatermark(action, metadata) {
    const errors = [];
    const params = action.parameters || {};
    const text = params.text;

    if (!text || text.trim().length === 0) {
      errors.push('Watermark text cannot be empty');
    }

    if (text && text.length > 100) {
      errors.push('Watermark text must be 100 characters or less');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate ADD_TEXT action
   */
  validateAddText(action, metadata) {
    const errors = [];
    const params = action.parameters || {};
    const text = params.text;
    const pages = params.pages;

    if (!text || text.trim().length === 0) {
      errors.push('Text to add cannot be empty');
    }

    if (text && text.length > 500) {
      errors.push('Text must be 500 characters or less');
    }

    if (!pages) {
      errors.push('Target pages must be specified');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate REDACT_TEXT action
   */
  validateRedactText(action, metadata) {
    const errors = [];
    const params = action.parameters || {};
    const pages = params.pages;

    if (!pages) {
      errors.push('Target pages must be specified for redaction');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate CROP_PAGES action
   */
  validateCropPages(action, metadata) {
    const errors = [];
    const params = action.parameters || {};
    const margin = params.margin;

    if (margin !== undefined && (margin < 0 || margin > 100)) {
      errors.push('Margin must be between 0 and 100');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate DUPLICATE_PAGES action
   */
  validateDuplicatePages(action, metadata) {
    const errors = [];
    const params = action.parameters || {};
    const pages = params.pages || [];
    const totalPages = metadata?.pageCount || 0;

    if (!Array.isArray(pages) || pages.length === 0) {
      errors.push('No pages specified for duplication');
      return { isValid: false, errors };
    }

    const invalidPages = pages.filter(p => p <= 0 || p > totalPages);
    if (invalidPages.length > 0) {
      errors.push(`Invalid page numbers: ${invalidPages.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate ENCRYPT_PDF action
   */
  validateEncryptPDF(action, metadata) {
    const errors = [];
    const params = action.parameters || {};
    const password = params.password;

    if (!password || password.trim().length === 0) {
      errors.push('Password cannot be empty for encryption');
    }

    if (password && password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate UNLOCK_PDF action
   */
  validateUnlockPDF(action, metadata) {
    const errors = [];

    if (!metadata?.isEncrypted) {
      errors.push('PDF is not encrypted. Unlock operation not needed.');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check if action could be destructive and needs confirmation
   */
  isDestructiveAction(actionType) {
    const destructiveActions = [
      'DELETE_PAGES',
      'DELETE_BLANK_PAGES',
      'ENCRYPT_PDF',
      'REMOVE_DUPLICATES'
    ];

    return destructiveActions.includes(actionType);
  }

  /**
   * Get confirmation message for destructive action
   */
  getDestructiveActionWarning(action, metadata) {
    const warnings = {
      'DELETE_PAGES': `This will permanently delete pages. Are you sure?`,
      'DELETE_BLANK_PAGES': `This will delete all detected blank pages. This action cannot be undone.`,
      'ENCRYPT_PDF': `After encryption, you'll need the password to open this PDF.`,
      'REMOVE_DUPLICATES': `This will delete detected duplicate pages. Are you sure?`
    };

    return warnings[action.type] || 'This action cannot be undone. Proceed?';
  }

  /**
   * Determine if action can be retried on failure
   */
  isRetryableError(errorType) {
    const retryableErrors = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'TEMPORARY_FILE_ERROR',
      'RESOURCE_EXHAUSTION'
    ];

    return retryableErrors.includes(errorType);
  }

  /**
   * Handle action execution error with recovery strategy
   */
  async handleExecutionError(error, action, attempt = 1) {
    const result = {
      recovered: false,
      shouldRetry: false,
      errorMessage: error.message,
      recoveryStrategy: null
    };

    if (this.isRetryableError(error.type)) {
      if (attempt < this.maxRetries) {
        result.shouldRetry = true;
        result.recoveryStrategy = `Retry (attempt ${attempt + 1}/${this.maxRetries})`;
        result.retryDelay = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
      }
    } else {
      // Non-retryable error, suggest alternative
      result.recoveryStrategy = this.suggestAlternative(action);
    }

    return result;
  }

  /**
   * Suggest alternative action when original fails
   */
  suggestAlternative(failedAction) {
    const alternatives = {
      'COMPRESS': 'Try a lower quality setting instead',
      'EXTRACT_PAGES': 'Try extracting fewer pages at once',
      'ENHANCE_SCAN': 'Try OCR to make text searchable instead',
      'ENCRYPT_PDF': 'Consider using a simpler password',
      'OCR_DOCUMENT': 'Try reducing the number of pages processed'
    };

    return alternatives[failedAction.type] || 'Try a different operation or contact support';
  }

  /**
   * Record action execution for history
   */
  recordExecution(jobId, action, status, result = null, error = null) {
    if (!this.executionHistory.has(jobId)) {
      this.executionHistory.set(jobId, []);
    }

    const record = {
      timestamp: new Date(),
      action: action.type,
      status, // 'success', 'failed', 'skipped'
      result,
      error: error ? error.message : null
    };

    this.executionHistory.get(jobId).push(record);

    // Cleanup old histories
    if (this.executionHistory.size > this.MAX_HISTORY_SIZE) {
      const firstKey = this.executionHistory.keys().next().value;
      this.executionHistory.delete(firstKey);
    }
  }

  /**
   * Get execution history for a job
   */
  getExecutionHistory(jobId) {
    return this.executionHistory.get(jobId) || [];
  }

  /**
   * Validate entire action sequence before execution
   */
  validateActionSequence(actions, metadata) {
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresConfirmation: false,
      confirmationMessage: ''
    };

    for (const action of actions) {
      const validation = this.validateAction(action, metadata);
      if (!validation.isValid) {
        validationResult.isValid = false;
        validationResult.errors.push(...validation.errors);
      }

      if (this.requiresExplicitConfirmation(action, metadata)) {
        validationResult.requiresConfirmation = true;
        validationResult.confirmationMessage = this.getDestructiveActionWarning(action, metadata);
      }
    }

    // Check for conflicting actions
    const actionTypes = actions.map(a => a.type);
    if (actionTypes.includes('DELETE_PAGES') && actionTypes.includes('DUPLICATE_PAGES')) {
      validationResult.warnings.push('Cannot both delete and duplicate pages');
      validationResult.isValid = false;
    }

    return validationResult;
  }

  requiresExplicitConfirmation(action, metadata) {
    if (!this.isDestructiveAction(action.type)) return false;
    if (action.type === 'DELETE_PAGES') {
      return action.parameters?.pages === 'all';
    }
    if (action.type === 'DELETE_BLANK_PAGES') {
      return false;
    }
    return ['ENCRYPT_PDF', 'REMOVE_DUPLICATES'].includes(action.type);
  }

  /**
   * Detect if PDF might be corrupted or invalid
   */
  detectPDFIssues(pdfMetadata) {
    const issues = [];

    if (!pdfMetadata) {
      issues.push('PDF metadata unavailable');
      return issues;
    }

    if (pdfMetadata.pageCount === 0) {
      issues.push('PDF has no pages');
    }

    if (pdfMetadata.pageCount > 5000) {
      issues.push('PDF has too many pages (may be slow to process)');
    }

    if (pdfMetadata.isEncrypted && !pdfMetadata.isUnlocked) {
      issues.push('PDF is password-protected');
    }

    if (pdfMetadata.isCorrupted) {
      issues.push('PDF may be corrupted');
    }

    return issues;
  }

  /**
   * Get estimated processing time for action
   */
  estimateProcessingTime(action, metadata) {
    let estimateMs = 1000; // Base overhead

    switch (action.type) {
      case 'COMPRESS':
        estimateMs += (metadata?.fileSizeMB || 1) * 200;
        break;
      case 'OCR_DOCUMENT':
        estimateMs += (metadata?.pageCount || 10) * 1000;
        break;
      case 'ENHANCE_SCAN':
        estimateMs += (metadata?.pageCount || 10) * 500;
        break;
      case 'EXTRACT_PAGES':
        estimateMs += (action.parameters?.pages?.length || 10) * 100;
        break;
      default:
        estimateMs += (metadata?.pageCount || 10) * 50;
    }

    return Math.min(estimateMs, 300000); // Cap at 5 minutes
  }

  /**
   * Check if user should be warned about operation time
   */
  shouldWarnAboutProcessingTime(estimatedMs) {
    const WARNING_THRESHOLD_MS = 10000; // 10 seconds
    return estimatedMs > WARNING_THRESHOLD_MS;
  }
}

module.exports = new ExecutionSafetyService();
