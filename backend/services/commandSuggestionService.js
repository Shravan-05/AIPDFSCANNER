/**
 * Command Suggestion Service
 * Provides intelligent command suggestions based on document type, history, and context
 */

class CommandSuggestionService {
  constructor() {
    // Document-type-specific suggestions
    this.documentTypeSuggestions = {
      invoice: [
        { command: 'extract data', description: 'Extract totals and line items', emoji: '💰' },
        { command: 'summarize', description: 'Get a quick summary', emoji: '📋' },
        { command: 'enhance', description: 'Improve scan quality', emoji: '🔍' },
        { command: 'delete blank pages', description: 'Remove unused pages', emoji: '🗑️' }
      ],
      resume: [
        { command: 'enhance', description: 'Improve document quality', emoji: '📄' },
        { command: 'compress below 2mb', description: 'Make it email-friendly', emoji: '📧' },
        { command: 'delete blank pages', description: 'Clean up extra pages', emoji: '✂️' },
        { command: 'rotate all 90', description: 'Fix orientation', emoji: '🔄' }
      ],
      contract: [
        { command: 'extract data', description: 'Find key information', emoji: '📋' },
        { command: 'redact page 1', description: 'Redact sensitive info', emoji: '🔒' },
        { command: 'encrypt', description: 'Add password protection', emoji: '🔐' },
        { command: 'annotate', description: 'Add notes or highlights', emoji: '🖊️' }
      ],
      scan: [
        { command: 'enhance', description: 'Improve readability', emoji: '🔍' },
        { command: 'ocr', description: 'Make text searchable', emoji: '🔤' },
        { command: 'rotate all', description: 'Fix page orientation', emoji: '🔄' },
        { command: 'delete blank pages', description: 'Remove blank scans', emoji: '🗑️' }
      ],
      form: [
        { command: 'extract data', description: 'Pull filled fields', emoji: '📝' },
        { command: 'enhance', description: 'Improve clarity', emoji: '🔍' },
        { command: 'delete blank pages', description: 'Remove empty pages', emoji: '✂️' }
      ],
      receipt: [
        { command: 'extract totals', description: 'Pull totals and dates', emoji: 'money' },
        { command: 'summarize receipt', description: 'Create an expense summary', emoji: 'receipt' },
        { command: 'compress', description: 'Reduce file size', emoji: 'box' }
      ],
      book: [
        { command: 'summarize this document', description: 'Create reading notes', emoji: 'book' },
        { command: 'ocr', description: 'Make pages searchable', emoji: 'text' },
        { command: 'compress', description: 'Optimize a large file', emoji: 'box' }
      ],
      document: [
        { command: 'compress', description: 'Reduce file size', emoji: '📦' },
        { command: 'merge', description: 'Combine documents', emoji: '🔗' },
        { command: 'extract pages', description: 'Pull specific pages', emoji: '📄' },
        { command: 'add watermark', description: 'Add branding', emoji: '🏷️' }
      ]
    };

    // Context-aware suggestions based on previous actions
    this.sequentialSuggestions = {
      'DELETE_BLANK_PAGES': [
        { command: 'enhance', description: 'Now improve remaining pages' },
        { command: 'compress', description: 'Reduce file size' },
        { command: 'ocr', description: 'Make pages searchable' }
      ],
      'COMPRESS': [
        { command: 'download', description: 'Download compressed file' },
        { command: 'extract pages', description: 'Work with specific pages' }
      ],
      'ENHANCE_SCAN': [
        { command: 'ocr', description: 'Convert to searchable text' },
        { command: 'compress', description: 'Reduce file size' }
      ],
      'ROTATE_PAGES': [
        { command: 'enhance', description: 'Improve quality' },
        { command: 'merge', description: 'Combine with another PDF' }
      ]
    };

    // Common pain points and how to solve them
    this.painPointSolutions = {
      'file too large': [
        { command: 'compress', description: 'Use compression to reduce size', confidence: 0.95 },
        { command: 'extract pages', description: 'Keep only needed pages', confidence: 0.80 }
      ],
      'orientation wrong': [
        { command: 'rotate all 90', description: 'Rotate all pages 90 degrees', confidence: 0.98 },
        { command: 'rotate all 180', description: 'Rotate all pages 180 degrees', confidence: 0.85 }
      ],
      'quality poor': [
        { command: 'enhance', description: 'Improve scan quality and clarity', confidence: 0.92 },
        { command: 'ocr', description: 'Extract text for better readability', confidence: 0.75 }
      ],
      'pages unorganized': [
        { command: 'reorder pages', description: 'Organize pages visually', confidence: 0.85 },
        { command: 'delete page', description: 'Remove unwanted pages', confidence: 0.80 }
      ]
    };

    this.commandFrequency = new Map();
  }

  /**
   * Get smart suggestions based on document type
   */
  getSuggestionsForDocumentType(docType) {
    const normalized = (docType || 'document').toLowerCase();
    return this.documentTypeSuggestions[normalized] || this.documentTypeSuggestions['document'];
  }

  /**
   * Get suggestions based on previous action
   */
  getSuggestionsForPreviousAction(lastAction) {
    return this.sequentialSuggestions[lastAction] || [];
  }

  /**
   * Analyze user's pain point and suggest solutions
   */
  getSolutionsForPainPoint(painPoint) {
    const normalized = painPoint.toLowerCase();
    
    for (const [key, solutions] of Object.entries(this.painPointSolutions)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return solutions;
      }
    }

    return [];
  }

  /**
   * Generate contextual suggestions for current state
   */
  generateContextualSuggestions(context) {
    const suggestions = [];

    // If document is large, suggest compression
    if (context.fileSize && context.fileSize > 10 * 1024 * 1024) {
      suggestions.push({
        command: 'compress',
        description: 'Your PDF is large. Try compression to reduce size.',
        emoji: '📦',
        priority: 'high'
      });
    }

    // If document has many blank pages, suggest cleanup
    if (context.hasBlankPages) {
      suggestions.push({
        command: 'delete blank pages',
        description: 'Remove blank pages to clean up the document',
        emoji: '🗑️',
        priority: 'high'
      });
    }

    // If document is scanned, suggest enhancement
    if (context.isScanned) {
      suggestions.push({
        command: 'enhance',
        description: 'Improve the quality of your scanned pages',
        emoji: '🔍',
        priority: 'medium'
      });

      suggestions.push({
        command: 'ocr',
        description: 'Make text searchable with OCR',
        emoji: '🔤',
        priority: 'medium'
      });
    }

    // If document type is detected, add type-specific suggestions
    if (context.documentType) {
      const typeSuggestions = this.getSuggestionsForDocumentType(context.documentType);
      suggestions.push(...typeSuggestions.slice(0, 2).map(s => ({
        ...s,
        priority: 'medium'
      })));
    }

    // If multiple files uploaded, suggest merge
    if (context.uploadedFileCount && context.uploadedFileCount > 1) {
      suggestions.push({
        command: 'merge all',
        description: 'Combine all uploaded documents',
        emoji: '🔗',
        priority: 'medium'
      });
    }

    // Track command frequency for personalized suggestions
    this.trackCommandFrequency(context.lastCommand);

    return suggestions.slice(0, 5);
  }

  /**
   * Track which commands user uses frequently
   */
  trackCommandFrequency(command) {
    if (!command) return;

    const current = this.commandFrequency.get(command) || 0;
    this.commandFrequency.set(command, current + 1);
  }

  /**
   * Get user's most frequently used commands
   */
  getUserFrequentCommands(limit = 5) {
    const sorted = [...this.commandFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([command, count]) => ({ command, frequency: count }));
  }

  /**
   * Get onboarding suggestions for new users
   */
  getOnboardingSuggestions() {
    return [
      { command: 'upload a pdf', description: 'Start by uploading a document', emoji: '📤' },
      { command: 'try delete page 1', description: 'Test page deletion', emoji: '🗑️' },
      { command: 'try compress this file', description: 'Reduce file size', emoji: '📦' },
      { command: 'try merge all', description: 'Combine multiple PDFs', emoji: '🔗' },
      { command: 'try add watermark confidential', description: 'Add branding', emoji: '🏷️' }
    ];
  }

  /**
   * Generate "quickstart" commands based on common workflows
   */
  getQuickstartWorkflows() {
    return [
      {
        name: 'Clean & Compress',
        steps: [
          'Delete blank pages',
          'Enhance quality',
          'Compress below 5mb'
        ],
        description: 'Clean up and optimize your PDF'
      },
      {
        name: 'Organize & Merge',
        steps: [
          'Delete unwanted pages',
          'Reorder pages',
          'Merge with other files'
        ],
        description: 'Organize and combine documents'
      },
      {
        name: 'Extract & Export',
        steps: [
          'Extract pages',
          'OCR if needed',
          'Download result'
        ],
        description: 'Work with specific pages'
      },
      {
        name: 'Secure & Share',
        steps: [
          'Add watermark',
          'Encrypt with password',
          'Compress for email'
        ],
        description: 'Protect and share your document'
      }
    ];
  }

  /**
   * Check if a command is common and provide quick execution hint
   */
  isCommonCommand(command) {
    const commonPatterns = [
      /delete.*page/i,
      /compress/i,
      /rotate.*90/i,
      /merge/i,
      /extract/i,
      /watermark/i
    ];

    return commonPatterns.some(pattern => pattern.test(command));
  }

  /**
   * Suggest related commands if user types similar command
   */
  suggestRelatedCommands(command) {
    const lower = command.toLowerCase();
    const related = new Map([
      [/compress|shrink|reduce/, ['optimize quality', 'compress below 5mb', 'make it lighter']],
      [/delete.*page|remove.*page/, ['delete blank pages', 'extract pages', 'delete all']],
      [/rotate/, ['rotate 90', 'rotate 180', 'rotate all pages']],
      [/enhance|improve|sharpen/, ['enhance quality', 'clean scan', 'improve readability']],
      [/merge|combine/, ['merge all uploaded', 'combine documents', 'join PDFs']],
      [/extract|split/, ['extract pages 1-5', 'split in half', 'pull specific pages']],
    ]);

    for (const [pattern, suggestions] of related) {
      if (pattern.test(lower)) {
        return suggestions;
      }
    }

    return [];
  }

  /**
   * Get help text for a specific command
   */
  getCommandHelp(command) {
    const helpTexts = {
      'compress': 'Reduces file size. You can specify quality level or maximum size. Example: "compress below 5mb"',
      'delete': 'Remove pages. You can delete specific pages or all blank pages. Example: "delete pages 1-3"',
      'rotate': 'Turn pages. Default is 90 degrees clockwise. Example: "rotate all 180"',
      'extract': 'Pull out specific pages into a new file. Example: "extract pages 1,3,5"',
      'merge': 'Combine multiple PDFs. Upload multiple files first.',
      'watermark': 'Add text overlay to all pages. Example: "watermark saying DRAFT"',
      'enhance': 'Improve quality of scanned documents. Sharpens and denoises.',
      'ocr': 'Extract text from images using optical character recognition.',
      'reorder': 'Reorganize pages. Best done visually in the editor.',
      'redact': 'Black out or blur sensitive information. Example: "redact top of page 1"'
    };

    const cmdLower = command.toLowerCase();
    for (const [key, help] of Object.entries(helpTexts)) {
      if (cmdLower.includes(key)) {
        return help;
      }
    }

    return 'I can help with PDF editing. Try "delete", "compress", "rotate", "merge", "extract", or "add watermark".';
  }
}

module.exports = new CommandSuggestionService();
