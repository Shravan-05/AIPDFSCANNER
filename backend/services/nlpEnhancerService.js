/**
 * NLP Enhancer Service
 * Provides advanced semantic matching, confidence scoring, and lightweight intent classification
 * This runs BEFORE expensive LLM calls and provides higher accuracy
 */

class NLPEnhancerService {
  constructor() {
    // Semantic word embeddings (simplified word2vec-style relationships)
    this.semanticRelations = {
      'compress': ['shrink', 'reduce', 'minimize', 'compact', 'lighten', 'squeeze', 'optimize'],
      'delete': ['remove', 'drop', 'erase', 'discard', 'strip', 'omit', 'eliminate'],
      'rotate': ['spin', 'turn', 'flip', 'twist', 'pivot', 'rotate'],
      'extract': ['pull', 'isolate', 'separate', 'take', 'grab', 'retrieve'],
      'enhance': ['improve', 'sharpen', 'clean', 'refine', 'brighten', 'beautify'],
      'watermark': ['stamp', 'brand', 'mark', 'label', 'sign'],
      'merge': ['combine', 'join', 'unite', 'concatenate', 'bind', 'fuse'],
      'split': ['divide', 'cut', 'chop', 'partition', 'separate', 'break'],
      'reorder': ['arrange', 'organize', 'sort', 'sequence', 'shuffle', 'rearrange'],
      'redact': ['censor', 'black out', 'blur', 'hide', 'cover', 'obscure'],
      'ocr': ['read', 'recognize', 'convert to text', 'scan text'],
      'summarize': ['condense', 'digest', 'brief', 'overview', 'recap'],
      'encrypt': ['secure', 'protect', 'lock', 'password'],
      'analyze': ['examine', 'review', 'inspect', 'check', 'assess'],
    };

    // Common command patterns with confidence boost
    this.commandPatterns = {
      'make_action_larger_scope': {
        patterns: ['all', 'every', 'entire', 'whole', 'complete', 'each'],
        boost: 0.15,
        description: 'applies to all pages'
      },
      'specific_pages': {
        patterns: [/\d+(?:-\d+)?/g],
        boost: 0.2,
        description: 'specific page numbers detected'
      },
      'quality_constraint': {
        patterns: ['high', 'low', 'medium', 'maximum', 'minimum', 'balanced', 'aggressive'],
        boost: 0.1,
        description: 'quality level specified'
      },
      'size_constraint': {
        patterns: /(\d+(?:\.\d+)?)\s*(mb|kb|gb)/i,
        boost: 0.15,
        description: 'size constraint specified'
      }
    };

    // Common typos and their corrections (lighter load than in aiParserService)
    this.commonTypos = {
      'dont': "don't",
      'thats': "that's",
      'ive': "i've",
      'youre': "you're",
      'wont': "won't",
      'cant': "can't",
    };

    // Confidence threshold for auto-execution
    this.CONFIDENCE_THRESHOLD = 0.75;
    this.initializeCache(250);
  }

  /**
   * Analyze semantic similarity between input and known intent keywords
   * Returns similarity score 0-1
   */
  computeSemanticSimilarity(inputWord, intentKeyword) {
    if (inputWord === intentKeyword) return 1.0;
    
    // Check direct semantic relation
    if (this.semanticRelations[intentKeyword]) {
      if (this.semanticRelations[intentKeyword].includes(inputWord)) {
        return 0.85;
      }
    }
    if (this.semanticRelations[inputWord]) {
      if (this.semanticRelations[inputWord].includes(intentKeyword)) {
        return 0.85;
      }
    }

    // Levenshtein distance-based similarity for misspellings
    const distance = this.levenshteinDistance(inputWord, intentKeyword);
    const maxLen = Math.max(inputWord.length, intentKeyword.length);
    return Math.max(0, 1 - (distance / maxLen));
  }

  /**
   * Calculate Levenshtein distance between two strings (for typo detection)
   */
  levenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[len1][len2];
  }

  /**
   * Extract and analyze contextual modifiers from command
   * Returns enhancement factors for confidence scoring
   */
  analyzeModifiers(text) {
    const modifiers = {
      hasQualityConstraint: false,
      hasSizeConstraint: false,
      hasScopeModifier: false,
      hasPageSpecific: false,
      urgencyLevel: 'normal', // low, normal, high
      clarityScore: 0.5
    };

    const lowerText = text.toLowerCase();

    // Check quality constraints
    if (/\b(?:high|low|medium|maximum|minimum|best|worst)\b/.test(lowerText)) {
      modifiers.hasQualityConstraint = true;
      modifiers.clarityScore += 0.15;
    }

    // Check size constraints
    if (/\d+(?:\.\d+)?\s*(?:mb|kb|gb)/i.test(lowerText)) {
      modifiers.hasSizeConstraint = true;
      modifiers.clarityScore += 0.1;
    }

    // Check scope modifiers
    if (/\b(?:all|every|entire|complete|whole|each)\b/.test(lowerText)) {
      modifiers.hasScopeModifier = true;
      modifiers.clarityScore += 0.1;
    }

    // Check for specific page numbers
    if (/\b\d+(?:\s*-\s*\d+)?\b/.test(lowerText)) {
      modifiers.hasPageSpecific = true;
      modifiers.clarityScore += 0.15;
    }

    // Urgency detection
    if (/\b(?:urgent|asap|immediately|right now|quickly|now)\b/i.test(lowerText)) {
      modifiers.urgencyLevel = 'high';
      modifiers.clarityScore += 0.05;
    }

    return modifiers;
  }

  /**
   * Quick confidence boost for clear, explicit commands
   * Returns confidence multiplier (0.8 - 1.2)
   */
  calculateConfidenceMultiplier(text, detectedIntent, baseConfidence) {
    let multiplier = 1.0;
    const modifiers = this.analyzeModifiers(text);

    // Strong base confidence already, maintain it
    if (baseConfidence >= 0.80) {
      multiplier += modifiers.clarityScore * 0.15;
    }
    
    // Moderate confidence, use modifiers to push higher
    if (baseConfidence >= 0.60 && baseConfidence < 0.80) {
      multiplier += modifiers.clarityScore * 0.25;
    }

    // Clamp multiplier
    return Math.min(1.2, Math.max(0.8, multiplier));
  }

  /**
   * Detect if user is asking for clarification or rephrasing
   * Returns true if command seems to be a follow-up clarification
   */
  isFollowUpCommand(text) {
    const followUpPatterns = [
      /^(?:no|actually|wait|sorry|i mean|let me rephrase|actually)/i,
      /^(?:instead|rather|better|change to|make it)/i,
      /^(?:more|less|bigger|smaller|stronger|weaker)/i
    ];

    return followUpPatterns.some(pattern => pattern.test(text.trim()));
  }

  /**
   * Detect if user is asking a question vs giving a command
   * Returns: 'command', 'question', 'clarification'
   */
  detectInputType(text) {
    const trimmed = text.trim();
    
    if (trimmed.endsWith('?')) return 'question';
    if (this.isFollowUpCommand(trimmed)) return 'clarification';
    return 'command';
  }

  /**
   * Suggest alternative intents if confidence is low
   * Useful for providing helpful hints to user
   */
  suggestAlternativeIntents(text, primaryIntent, primaryConfidence) {
    if (primaryConfidence > 0.70) return [];

    const suggestions = [];
    const words = text.toLowerCase().split(/\s+/);

    // Look for keywords that might indicate alternative intents
    const keywordMapping = {
      'size': ['COMPRESS', 'EXTRACT_PAGES'],
      'page': ['DELETE_PAGES', 'EXTRACT_PAGES', 'ROTATE_PAGES'],
      'all': ['DELETE_BLANK_PAGES', 'ROTATE_PAGES', 'COMPRESS'],
      'text': ['ADD_TEXT', 'REDACT_TEXT', 'OCR_DOCUMENT'],
      'order': ['REORDER_PAGES', 'MERGE_PDF'],
    };

    for (const word of words) {
      if (keywordMapping[word]) {
        suggestions.push(...keywordMapping[word]);
      }
    }

    return [...new Set(suggestions)].slice(0, 3);
  }

  /**
   * Lightweight pre-processing before main NLP parsing
   * Returns early if command is very clear
   */
  async preprocessCommand(text) {
    const result = {
      normalized: text.toLowerCase().trim(),
      inputType: this.detectInputType(text),
      isFollowUp: this.isFollowUpCommand(text),
      hasModifiers: Object.values(this.analyzeModifiers(text)).some(v => v === true),
      estimatedClarity: 0.5
    };

    result.estimatedClarity = this.analyzeModifiers(text).clarityScore;
    return result;
  }

  /**
   * Validate extracted entities for logical correctness
   * Returns validation errors if any
   */
  validateEntities(entities, intent) {
    const errors = [];

    if (entities.pages && Array.isArray(entities.pages)) {
      if (entities.pages.length === 0 && 
          ['DELETE_PAGES', 'EXTRACT_PAGES', 'DUPLICATE_PAGES'].includes(intent)) {
        errors.push('No specific pages provided for this operation');
      }

      // Check for invalid page numbers (negative, zero)
      if (entities.pages.some(p => p <= 0)) {
        errors.push('Page numbers must be positive');
      }
    }

    if (entities.constraints) {
      if (entities.constraints.maxSize && entities.constraints.maxSize <= 0) {
        errors.push('File size constraint must be positive');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalize file size constraints to standard unit (MB)
   */
  normalizeSizeConstraint(size, unit) {
    const unitMultipliers = {
      'kb': 0.001,
      'mb': 1,
      'gb': 1024,
      'megabytes': 1,
      'kilobytes': 0.001,
      'gigabytes': 1024
    };

    const normalizedUnit = unit.toLowerCase();
    const multiplier = unitMultipliers[normalizedUnit] || 1;
    return {
      bytes: Math.round(size * multiplier * 1024 * 1024),
      mb: size * multiplier,
      original: { size, unit }
    };
  }

  /**
   * Cache common parsed commands to avoid re-parsing identical requests
   */
  initializeCache(maxSize = 100) {
    this.commandCache = new Map();
    this.commandCacheMaxSize = maxSize;
  }

  getCachedParse(command) {
    if (!this.commandCache) return null;
    return this.commandCache.get(command);
  }

  setCachedParse(command, result) {
    if (!this.commandCache) return;
    if (this.commandCache.size >= this.commandCacheMaxSize) {
      const firstKey = this.commandCache.keys().next().value;
      this.commandCache.delete(firstKey);
    }
    this.commandCache.set(command, result);
  }

  /**
   * Performance: Quick intent detection without full NLP parsing
   * Used for high-confidence matches only
   */
  quickIntentMatch(text) {
    const lowerText = text.toLowerCase();

    // Direct keyword matches with high confidence
    const quickMatches = {
      'delete blank': { intent: 'DELETE_BLANK_PAGES', confidence: 0.95 },
      'merge all': { intent: 'MERGE_PDF', confidence: 0.92 },
      'compress': { intent: 'COMPRESS', confidence: 0.88 },
      'watermark': { intent: 'ADD_WATERMARK', confidence: 0.85 },
      'rotate': { intent: 'ROTATE_PAGES', confidence: 0.82 },
      'extract': { intent: 'EXTRACT_PAGES', confidence: 0.80 },
    };

    for (const [keyword, match] of Object.entries(quickMatches)) {
      if (lowerText.includes(keyword)) {
        return match;
      }
    }

    return null;
  }

  normalizeForCache(command) {
    return (command || '')
      .toLowerCase()
      .replace(/[^\w\s.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  cloneParse(result) {
    return result ? JSON.parse(JSON.stringify(result)) : null;
  }
}

module.exports = new NLPEnhancerService();
