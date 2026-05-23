class AiParserService {
  constructor() {
    this.typoOverrides = {
      'compres': 'compress',
      'comprees': 'compress',
      'rotat': 'rotate',
      'roate': 'rotate',
      'delet': 'delete',
      'remover': 'remove',
      'exract': 'extract',
      'extact': 'extract',
      'wartermark': 'watermark',
      'watrmark': 'watermark',
      'redac': 'redact',
      'enhanse': 'enhance',
      'splite': 'split',
      're-order': 'reorder',
      'water mark': 'watermark',
      'blackout': 'black out',
      'merg': 'merge',
      'combin': 'combine',
      'rotaet': 'rotate',
      'delte': 'delete',
      'compresion': 'compression',
      'optmize': 'optimize',
      'orgnise': 'organize',
      'reoreder': 'reorder',
      'extarct': 'extract'
    };

    // Primary intent signatures with weighted semantic patterns
    this.intentPatterns = {
      COMPRESS: {
        weight: 1.0,
        patterns: [
          { words: ['compress', 'shrink', 'reduce'], boost: 0.3 },
          { words: ['smaller', 'lighter', 'downsize', 'compact'], boost: 0.25 },
          { words: ['optimize', 'compression'], boost: 0.2 },
          { words: ['zip', 'minimize'], boost: 0.15 },
          { words: ['below', 'under', 'max', 'mb', 'kb', 'size', 'small'], boost: 0.1 }
        ]
      },
      DELETE_PAGES: {
        weight: 1.0,
        patterns: [
          { words: ['delete', 'remove', 'drop', 'erase', 'discard'], boost: 0.3 },
          { words: ['strip', 'exclude', 'cut page', 'omit'], boost: 0.2 },
          { words: ['page', 'pages'], boost: 0.1, required: false }
        ]
      },
      DELETE_BLANK_PAGES: {
        weight: 1.2,
        patterns: [
          { words: ['blank', 'empty', 'useless', 'unused'], boost: 0.3 },
          { words: ['delete blank', 'remove blank', 'drop blank', 'blank pages', 'blank page', 'clean pages'], boost: 0.4 }
        ]
      },
      ROTATE_PAGES: {
        weight: 1.0,
        patterns: [
          { words: ['rotate', 'spin', 'turn', 'tilt', 'flip'], boost: 0.3 },
          { words: ['rotation', 'angle'], boost: 0.2 },
          { words: ['90', '180', '270', '360', 'clockwise', 'counter', 'upside'], boost: 0.15 }
        ]
      },
      EXTRACT_PAGES: {
        weight: 1.0,
        patterns: [
          { words: ['extract', 'pull', 'isolate', 'separate'], boost: 0.3 },
          { words: ['take out', 'get page', 'retrieve', 'pluck'], boost: 0.2 }
        ]
      },
      SPLIT_PDF: {
        weight: 1.0,
        patterns: [
          { words: ['split', 'cut', 'divide', 'chop', 'break'], boost: 0.3 },
          { words: ['half', 'partition', 'separate', 'two'], boost: 0.2 },
          { words: ['after', 'page'], boost: 0.1 }
        ]
      },
      REDACT_TEXT: {
        weight: 1.0,
        patterns: [
          { words: ['redact', 'censor', 'black out', 'blackbox', 'blacken', 'blur'], boost: 0.3 },
          { words: ['hide', 'cover', 'mask', 'obscure'], boost: 0.2 }
        ]
      },
      ADD_TEXT: {
        weight: 1.0,
        patterns: [
          { words: ['stamp', 'add text', 'write', 'label', 'sign'], boost: 0.3 },
          { words: ['overlay', 'text stamp', 'type', 'put text'], boost: 0.2 }
        ]
      },
      ADD_WATERMARK: {
        weight: 1.0,
        patterns: [
          { words: ['watermark', 'brand', 'draft stamp', 'watermarking'], boost: 0.4 },
          { words: ['confidential', 'draft', 'stamp saying'], boost: 0.15 }
        ]
      },
      ENHANCE_SCAN: {
        weight: 1.0,
        patterns: [
          { words: ['enhance', 'clean', 'fix', 'improve', 'sharpen'], boost: 0.3 },
          { words: ['deskew', 'denoise', 'contrast', 'beautify', 'brighten'], boost: 0.25 },
          { words: ['readable', 'better', 'quality', 'scan', 'scanned'], boost: 0.1 }
        ]
      },
      REORDER_PAGES: {
        weight: 1.0,
        patterns: [
          { words: ['reorder', 'arrange', 'sort', 'shuffle', 'swap'], boost: 0.3 },
          { words: ['move page', 'organize', 'fix order', 'reorganize', 're-sequence'], boost: 0.25 }
        ]
      },
      MERGE_PDF: {
        weight: 1.0,
        patterns: [
          { words: ['merge', 'combine', 'join', 'concatenate', 'append'], boost: 0.3 },
          { words: ['put together', 'union', 'bind', 'unite', 'fuse'], boost: 0.25 },
          { words: ['all', 'together', 'uploaded', 'files', 'documents'], boost: 0.08 }
        ]
      },
      SUMMARIZE_DOCUMENT: {
        weight: 0.9,
        patterns: [
          { words: ['summarize', 'summary', 'overview', 'digest', 'recap', 'brief'], boost: 0.3 },
          { words: ['tl;dr', 'tldr', 'key points', 'main ideas', 'gist'], boost: 0.25 }
        ]
      },
      ANALYZE_DOCUMENT: {
        weight: 0.9,
        patterns: [
          { words: ['analyze', 'analyse', 'examine', 'inspect', 'review'], boost: 0.3 },
          { words: ['check', 'look over', 'what is this', 'identify'], boost: 0.2 }
        ]
      },
      EXTRACT_DATA: {
        weight: 0.9,
        patterns: [
          { words: ['extract', 'pull data', 'get data', 'export data'], boost: 0.25 },
          { words: ['totals', 'amount', 'numbers', 'table', 'excel'], boost: 0.2 },
          { words: ['invoice', 'receipt', 'expenses', 'cost', 'total'], boost: 0.15 }
        ]
      },
      OCR_DOCUMENT: {
        weight: 0.9,
        patterns: [
          { words: ['ocr', 'text recognition', 'read text', 'extract text'], boost: 0.3 },
          { words: ['convert to text', 'recognize', 'optical character'], boost: 0.2 }
        ]
      },
      CROP_PAGES: {
        weight: 1.0,
        patterns: [
          { words: ['crop', 'trim', 'cut edges', 'remove margins'], boost: 0.3 },
          { words: ['boundaries', 'whitespace', 'margins'], boost: 0.2 },
          { words: ['resize frame', 'adjust bounds'], boost: 0.15 }
        ]
      },
      ROTATE_CLOCKWISE: {
        weight: 0.8,
        patterns: [
          { words: ['rotate right', 'turn right', 'clockwise'], boost: 0.3 }
        ]
      },
      ROTATE_COUNTER_CLOCKWISE: {
        weight: 0.8,
        patterns: [
          { words: ['rotate left', 'turn left', 'counter-clockwise', 'counterclockwise'], boost: 0.3 }
        ]
      },
      REORDER_SMART: {
        weight: 0.8,
        patterns: [
          { words: ['sort', 'arrange', 'organize', 'order'], boost: 0.3 },
          { words: ['alphabetically', 'numerically', 'by size', 'by date'], boost: 0.25 }
        ]
      },
      INSERT_PAGES: {
        weight: 0.9,
        patterns: [
          { words: ['insert', 'add page', 'add blank', 'append page'], boost: 0.3 },
          { words: ['between', 'before', 'after'], boost: 0.2 }
        ]
      },
      DUPLICATE_PAGES: {
        weight: 0.8,
        patterns: [
          { words: ['duplicate', 'copy', 'repeat', 'clone'], boost: 0.3 },
          { words: ['page', 'pages'], boost: 0.15 }
        ]
      },
      REMOVE_DUPLICATES: {
        weight: 0.9,
        patterns: [
          { words: ['remove duplicates', 'delete duplicates', 'remove dupes'], boost: 0.4 },
          { words: ['duplicate pages', 'repeated pages'], boost: 0.25 }
        ]
      },
      ENCRYPT_PDF: {
        weight: 0.9,
        patterns: [
          { words: ['encrypt', 'password', 'secure', 'protect'], boost: 0.3 },
          { words: ['lock', 'password protected', 'restricted'], boost: 0.25 }
        ]
      },
      UNLOCK_PDF: {
        weight: 0.9,
        patterns: [
          { words: ['unlock', 'decrypt', 'unprotect', 'remove password'], boost: 0.3 },
          { words: ['restricted access'], boost: 0.2 }
        ]
      }
    };

    this.dictionary = new Set();
    for (const [, intentDef] of Object.entries(this.intentPatterns)) {
      for (const p of intentDef.patterns) {
        for (const w of p.words) {
          if (!w.includes(' ')) this.dictionary.add(w);
        }
      }
    }

    // Synonym expansion map for paraphrase matching
    this.synonymMap = {
      'make': ['create', 'generate', 'produce', 'do'],
      'fix': ['repair', 'correct', 'resolve', 'remedy', 'adjust'],
      'get': ['obtain', 'retrieve', 'fetch', 'acquire', 'extract'],
      'remove': ['delete', 'eliminate', 'erase', 'discard', 'drop', 'strip'],
      'put': ['place', 'add', 'insert', 'position', 'set'],
      'change': ['modify', 'alter', 'convert', 'transform', 'edit'],
      'show': ['display', 'view', 'reveal', 'preview'],
      'help': ['assist', 'guide', 'support'],
      'need': ['require', 'want', 'must', 'should'],
      'can': ['could', 'would', 'able', 'may'],
      'this': ['the', 'my', 'current', 'active', 'selected'],
      'document': ['file', 'pdf', 'paper', 'doc', 'scan'],
      'page': ['pages', 'sheet', 'slide', 'folio'],
      'tell': ['describe', 'explain', 'tell me']
    };

    this.negationWords = new Set(['not', 'dont', "don't", 'never', 'no', 'without', 'except', 'skip', 'avoid']);
    this.protectedWords = new Set([
      'make', 'this', 'that', 'these', 'those', 'it', 'them', 'then', 'and', 'all', 'every',
      'below', 'under', 'above', 'over', 'with', 'without', 'before', 'after', 'to', 'from', 'put'
    ]);

    this.intentExamples = {
      COMPRESS: ['make this smaller', 'reduce the file size', 'compress below 5 mb', 'make it lightweight'],
      DELETE_BLANK_PAGES: ['remove useless pages', 'delete empty pages', 'clean blank pages'],
      ROTATE_PAGES: ['fix the orientation', 'turn scanned pages', 'rotate all pages'],
      EXTRACT_PAGES: ['pull out page three', 'take pages from this pdf', 'separate these pages'],
      SPLIT_PDF: ['cut this in half', 'split after page two', 'divide this pdf'],
      REDACT_TEXT: ['hide sensitive information', 'black out the top', 'cover private details'],
      ADD_TEXT: ['stamp approved', 'write text on the page', 'label this pdf'],
      ADD_WATERMARK: ['mark as confidential', 'add draft watermark', 'brand this document'],
      ENHANCE_SCAN: ['make it readable', 'clean this scan', 'improve scan quality'],
      REORDER_PAGES: ['fix the order', 'arrange the pages', 'put pages in sequence'],
      MERGE_PDF: ['put these together', 'join all uploaded pdfs', 'combine documents'],
      SUMMARIZE_DOCUMENT: ['tell me the gist', 'summarize this document', 'give key points'],
      ANALYZE_DOCUMENT: ['what kind of document is this', 'inspect this file', 'review this document'],
      EXTRACT_DATA: ['export totals to excel', 'extract invoice amounts', 'pull data from receipt'],
      OCR_DOCUMENT: ['make text searchable', 'read scanned text', 'convert scan to text'],
      CROP_PAGES: ['trim the margins', 'crop white edges', 'remove whitespace around pages'],
      INSERT_PAGES: ['add a blank page', 'insert page after three', 'append a page'],
      DUPLICATE_PAGES: ['copy page two', 'duplicate these pages', 'clone page one'],
      REMOVE_DUPLICATES: ['remove repeated pages', 'delete duplicate pages', 'dedupe this pdf'],
      ENCRYPT_PDF: ['lock this pdf', 'protect with password', 'secure this file'],
      UNLOCK_PDF: ['remove password', 'unlock this pdf', 'decrypt document']
    };

    this.stopWords = new Set(['a', 'an', 'the', 'this', 'that', 'it', 'to', 'for', 'of', 'in', 'on', 'with', 'my', 'please', 'can', 'you']);
    this.dependencyOrder = [
      'DELETE_BLANK_PAGES', 'REMOVE_DUPLICATES', 'DELETE_PAGES', 'ROTATE_PAGES',
      'CROP_PAGES', 'ENHANCE_SCAN', 'OCR_DOCUMENT', 'REORDER_PAGES', 'EXTRACT_PAGES',
      'SPLIT_PDF', 'ADD_TEXT', 'ADD_WATERMARK', 'REDACT_TEXT', 'COMPRESS', 'MERGE_PDF'
    ];

    this.ordinalNumbers = {
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      fifth: 5,
      sixth: 6,
      seventh: 7,
      eighth: 8,
      ninth: 9,
      tenth: 10,
      last: 'last',
      final: 'last'
    };

    this.directPhraseIntents = [
      { pattern: /\b(make|turn).*\b(smaller|lighter|email friendly|shareable)\b/, intent: 'COMPRESS', confidence: 0.9 },
      { pattern: /\b(delete|remove|drop|erase).*\b(page|pages|first|second|third|fourth|fifth|\d+)\b/, intent: 'DELETE_PAGES', confidence: 0.93 },
      { pattern: /\b(extract|pull|take|get).*\b(page|pages|first|second|third|fourth|fifth|\d+)\b/, intent: 'EXTRACT_PAGES', confidence: 0.9 },
      { pattern: /\b(clean|fix|improve).*\b(scan|readability|quality)\b|\bmake it readable\b/, intent: 'ENHANCE_SCAN', confidence: 0.9 },
      { pattern: /\b(remove|delete|drop).*\b(useless|blank|empty)\b.*pages?\b/, intent: 'DELETE_BLANK_PAGES', confidence: 0.92 },
      { pattern: /\b(fix|repair|correct).*\border\b|\breorder\b/, intent: 'REORDER_PAGES', confidence: 0.88 },
      { pattern: /\b(put|bring|join|combine|merge).*\b(together|uploaded|all)\b/, intent: 'MERGE_PDF', confidence: 0.88 },
      { pattern: /\b(make|convert).*\b(searchable|selectable text)\b/, intent: 'OCR_DOCUMENT', confidence: 0.88 }
    ];
  }

  getLevenshteinDistance(s1, s2) {
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

  autocorrectWord(word) {
    const suffix = /,$/.test(word) ? ',' : '';
    const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
    if (cleanWord.length <= 2 || /\d/.test(cleanWord) || this.protectedWords.has(cleanWord)) return (cleanWord || word) + suffix;
    if (this.typoOverrides[word]) return this.typoOverrides[word];
    if (this.dictionary.has(cleanWord)) return cleanWord + suffix;
    let bestMatch = cleanWord;
    let minDistance = 3;
    for (const dictWord of this.dictionary) {
      const distance = this.getLevenshteinDistance(cleanWord, dictWord);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = dictWord;
      }
    }
    const ratio = minDistance / Math.max(cleanWord.length, bestMatch.length);
    return (minDistance <= 1 || ratio <= 0.25 ? bestMatch : cleanWord) + suffix;
  }

  normalizeText(text) {
    let cleanText = text.toLowerCase().replace(/[^\w\s'",-]/g, ' ').trim();
    for (const [typo, correction] of Object.entries(this.typoOverrides)) {
      if (typo.includes(' ')) {
        const regex = new RegExp(`\\b${typo.replace(/ /g, '\\s+')}\\b`, 'gi');
        cleanText = cleanText.replace(regex, correction);
      }
    }
    const words = cleanText.split(/\s+/);
    const correctedWords = words.map(w => this.autocorrectWord(w));
    return correctedWords.join(' ');
  }

  splitCommands(text) {
    const splitRegex = /\b(?:and\s+then|then|after\s+that|and\s+also|next|afterwards|also|finally)\b/g;
    const unified = text.replace(splitRegex, ',');
    const segments = unified.split(',').map(p => p.trim()).filter(p => p.length > 0);
    return segments;
  }

  expandParaphrase(text) {
    let expanded = text;
    for (const [word, synonyms] of Object.entries(this.synonymMap)) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      expanded = expanded.replace(regex, `${word} ${synonyms.join(' ')}`);
    }
    return expanded;
  }

  scoreIntent(text, intentDef) {
    let score = 0;
    let matchedPatterns = 0;
    const words = text.split(/\s+/);
    const wordSet = new Set(words);

    for (const pattern of intentDef.patterns) {
      let patternMatch = 0;
      for (const pWord of pattern.words) {
        const pWords = pWord.split(/\s+/);
        if (pWords.length === 1) {
          if (wordSet.has(pWord)) {
            patternMatch++;
          }
        } else {
          if (text.includes(pWord)) {
            patternMatch += pWords.length;
          }
        }
      }
      if (patternMatch > 0) {
        const ratio = patternMatch / pattern.words.length;
        score += ratio * pattern.boost * intentDef.weight;
        matchedPatterns++;
      }
    }

    const totalPatterns = intentDef.patterns.length;
    score = score / Math.max(totalPatterns, 1);
    score = Math.min(score + matchedPatterns * 0.05, 0.98);
    return score;
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s.-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter(token => !this.stopWords.has(token));
  }

  buildSemanticVector(text) {
    const vector = new Map();
    for (const token of this.tokenize(text)) {
      vector.set(token, (vector.get(token) || 0) + 1);
      const synonyms = this.synonymMap[token] || [];
      for (const synonym of synonyms) {
        vector.set(synonym, (vector.get(synonym) || 0) + 0.35);
      }
    }
    return vector;
  }

  cosineSimilarity(left, right) {
    let dot = 0;
    let leftMag = 0;
    let rightMag = 0;
    for (const value of left.values()) leftMag += value * value;
    for (const value of right.values()) rightMag += value * value;
    for (const [key, value] of left.entries()) {
      dot += value * (right.get(key) || 0);
    }
    if (!leftMag || !rightMag) return 0;
    return dot / (Math.sqrt(leftMag) * Math.sqrt(rightMag));
  }

  scoreSemanticIntent(text, intent) {
    const examples = this.intentExamples[intent] || [];
    if (examples.length === 0) return 0;
    const commandVector = this.buildSemanticVector(text);
    return examples.reduce((best, example) => {
      const score = this.cosineSimilarity(commandVector, this.buildSemanticVector(example));
      return Math.max(best, score);
    }, 0);
  }

  orderActions(actions) {
    return [...actions].sort((a, b) => {
      const aIndex = this.dependencyOrder.indexOf(a.type);
      const bIndex = this.dependencyOrder.indexOf(b.type);
      const safeA = aIndex === -1 ? this.dependencyOrder.length : aIndex;
      const safeB = bIndex === -1 ? this.dependencyOrder.length : bIndex;
      if (safeA !== safeB) return safeA - safeB;
      const priorityWeight = { high: 0, normal: 1, low: 2 };
      return (priorityWeight[a.priority] ?? 1) - (priorityWeight[b.priority] ?? 1);
    });
  }

  getDirectPhraseMatch(text) {
    for (const item of this.directPhraseIntents) {
      if (item.pattern.test(text)) return item;
    }
    return null;
  }

  async parse(command, inputMode = 'text', history = []) {
    const originalInput = command;
    const normalized = this.normalizeText(command);

    const contextResult = this.resolveContext(normalized, history);
    if (contextResult) {
      contextResult.original_input = originalInput;
      contextResult.input_mode = inputMode;
      return contextResult;
    }

    const segments = this.splitCommands(normalized);
    const actions = [];
    const detectedIntents = new Map();
    let totalConfidence = 0;
    let needsClarification = false;
    let clarificationQuestion = '';

    const globalEntities = {
      pages: [],
      ranges: [],
      files: [],
      constraints: {}
    };

    for (const segment of segments) {
      const parsedSegment = this.parseSegment(segment);
      if (parsedSegment.intent !== 'Unknown') {
        const key = parsedSegment.intent;
        detectedIntents.set(key, (detectedIntents.get(key) || 0) + parsedSegment.confidence);
        totalConfidence += parsedSegment.confidence;
        if (parsedSegment.needs_clarification) {
          needsClarification = true;
          clarificationQuestion = parsedSegment.clarification_question;
        } else {
          actions.push(...parsedSegment.actions);
        }
        if (parsedSegment.entities.pages.length > 0) {
          globalEntities.pages = [...new Set([...globalEntities.pages, ...parsedSegment.entities.pages])];
        }
        if (parsedSegment.entities.ranges.length > 0) {
          globalEntities.ranges = [...new Set([...globalEntities.ranges, ...parsedSegment.entities.ranges])];
        }
        if (parsedSegment.entities.constraints) {
          globalEntities.constraints = { ...globalEntities.constraints, ...parsedSegment.entities.constraints };
        }
      }
    }

    let finalIntent = 'Unknown';
    let finalConfidence = 0.0;

    if (detectedIntents.size > 0) {
      const sorted = [...detectedIntents.entries()].sort((a, b) => b[1] - a[1]);
      const primary = sorted[0][0];
      if (sorted.length > 1 && sorted[0][1] < sorted[1][1] * 1.5) {
        finalIntent = sorted.map(s => s[0]).join(' & ');
      } else {
        finalIntent = primary;
      }
      finalConfidence = Math.min(totalConfidence / detectedIntents.size, 0.98);
    } else {
      const expandedNormalized = this.expandParaphrase(normalized);
      const fallbackSegments = this.splitCommands(expandedNormalized);
      for (const segment of fallbackSegments) {
        const parsedSegment = this.parseSegment(segment);
        if (parsedSegment.intent !== 'Unknown') {
          actions.push(...parsedSegment.actions);
          if (parsedSegment.intent !== 'Unknown') {
            detectedIntents.set(parsedSegment.intent, parsedSegment.confidence);
            totalConfidence += parsedSegment.confidence;
          }
        }
      }
      if (detectedIntents.size > 0) {
        const sorted = [...detectedIntents.entries()].sort((a, b) => b[1] - a[1]);
        finalIntent = sorted[0][0];
        finalConfidence = Math.min(totalConfidence / detectedIntents.size, 0.98);
      }
    }

    if (detectedIntents.size === 0) {
      needsClarification = true;
      clarificationQuestion = "I couldn't detect a PDF operation in your request. Try saying something like 'delete page 1', 'add a watermark', 'compress this file', or 'merge all documents'.";
      finalIntent = 'Unrecognized Request';
      finalConfidence = 0.15;
    }

    if (needsClarification) {
      actions.length = 0;
    }

    return {
      original_input: originalInput,
      input_mode: inputMode,
      intent: finalIntent,
      confidence: parseFloat(finalConfidence.toFixed(2)),
      entities: globalEntities,
      actions: this.orderActions(actions),
      needs_clarification: needsClarification,
      clarification_question: clarificationQuestion
    };
  }

  parseSegment(text) {
    const result = {
      intent: 'Unknown',
      confidence: 0.0,
      actions: [],
      entities: { pages: [], ranges: [], constraints: {} },
      needs_clarification: false,
      clarification_question: ''
    };

    let bestIntent = null;
    let bestScore = 0;

    for (const [type, intentDef] of Object.entries(this.intentPatterns)) {
      const lexicalScore = this.scoreIntent(text, intentDef);
      const semanticScore = this.scoreSemanticIntent(text, type);
      const score = Math.max(lexicalScore, semanticScore * 0.55);
      if (score > bestScore) {
        bestScore = score;
        bestIntent = type;
      }
    }

    const directMatch = this.getDirectPhraseMatch(text);
    if (directMatch && directMatch.confidence > (0.65 + (bestScore * 0.35))) {
      bestIntent = directMatch.intent;
      bestScore = Math.max(bestScore, (directMatch.confidence - 0.65) / 0.35);
    }

    if (!bestIntent || bestScore < 0.05) {
      return result;
    }

    result.intent = bestIntent;
    result.confidence = Math.min(0.65 + (bestScore * 0.35), 0.98);

    const extractedPages = this.extractPagesAndRanges(text);
    result.entities.pages = extractedPages.pages;
    result.entities.ranges = extractedPages.ranges;

    const extractedText = this.extractQuotes(text);
    const extractedAngle = this.extractAngle(text);
    const extractedPosition = this.extractPosition(text);
    const extractedConstraints = this.extractConstraints(text);

    result.entities.constraints = extractedConstraints;

    switch (bestIntent) {
      case 'DELETE_BLANK_PAGES': {
        result.actions.push({
          type: 'DELETE_BLANK_PAGES',
          priority: 'high',
          parameters: {}
        });
        break;
      }
      case 'DELETE_PAGES': {
        if (extractedPages.pages.length === 0 && !text.includes('all') && !text.includes('every')) {
          result.needs_clarification = true;
          result.clarification_question = 'Which pages would you like to delete? E.g., "delete page 1" or "remove pages 2-4"';
        } else {
          const pages = text.includes('all') || text.includes('every') ? 'all' : extractedPages.pages;
          result.actions.push({
            type: 'DELETE_PAGES',
            priority: 'normal',
            parameters: { pages }
          });
        }
        break;
      }
      case 'ROTATE_PAGES': {
        const pages = text.includes('all') || text.includes('every') || extractedPages.pages.length === 0 ? 'all' : extractedPages.pages;
        result.actions.push({
          type: 'ROTATE_PAGES',
          priority: 'normal',
          parameters: {
            pages,
            degree: extractedAngle || 90
          }
        });
        break;
      }
      case 'COMPRESS': {
        result.actions.push({
          type: 'COMPRESS',
          priority: 'normal',
          parameters: {
            quality: extractedConstraints.quality || 'balanced',
            level: extractedConstraints.level || 'medium',
            maxSize: extractedConstraints.maxSize || null,
            sizeUnit: extractedConstraints.sizeUnit || null
          }
        });
        break;
      }
      case 'EXTRACT_PAGES': {
        if (extractedPages.pages.length === 0) {
          result.needs_clarification = true;
          result.clarification_question = 'Which pages would you like to extract? E.g., "extract pages 1,3" or "pull pages 2-5"';
        } else {
          result.actions.push({
            type: 'EXTRACT_PAGES',
            priority: 'normal',
            parameters: { pages: extractedPages.pages }
          });
        }
        break;
      }
      case 'SPLIT_PDF': {
        const afterMatch = text.match(/(?:after|at)?\s*page\s*(\d+)/);
        const halfMatch = text.match(/\b(?:half|middle)\b/);
        if (afterMatch) {
          result.actions.push({
            type: 'SPLIT_PDF',
            priority: 'normal',
            parameters: { afterPage: parseInt(afterMatch[1], 10) }
          });
        } else if (halfMatch) {
          result.actions.push({
            type: 'SPLIT_PDF',
            priority: 'normal',
            parameters: { afterPage: 'half' }
          });
        } else {
          result.needs_clarification = true;
          result.clarification_question = 'Where should I split this PDF? E.g., "split after page 3" or "cut in half"';
        }
        break;
      }
      case 'REDACT_TEXT': {
        const pages = text.includes('all') || text.includes('every') || extractedPages.pages.length === 0 ? 'all' : extractedPages.pages;
        result.actions.push({
          type: 'REDACT_TEXT',
          priority: 'normal',
          parameters: {
            pages,
            position: extractedPosition || 'top'
          }
        });
        break;
      }
      case 'ADD_TEXT': {
        if (!extractedText) {
          result.needs_clarification = true;
          result.clarification_question = 'What text would you like to add? Please place it in quotes, e.g., stamp "APPROVED"';
        } else {
          const pages = text.includes('all') || text.includes('every') || extractedPages.pages.length === 0 ? 'all' : extractedPages.pages;
          result.actions.push({
            type: 'ADD_TEXT',
            priority: 'normal',
            parameters: {
              text: extractedText,
              pages
            }
          });
        }
        break;
      }
      case 'ADD_WATERMARK': {
        result.actions.push({
          type: 'ADD_WATERMARK',
          priority: 'normal',
          parameters: {
            text: extractedText || 'CONFIDENTIAL'
          }
        });
        break;
      }
      case 'ENHANCE_SCAN': {
        result.needs_clarification = true;
        result.clarification_question = 'Enhance scan is optimized directly inside the dedicated Scanner Workspace. Would you like to switch there?';
        break;
      }
      case 'REORDER_PAGES': {
        result.needs_clarification = true;
        result.clarification_question = 'Reordering is best managed visually in the Document Editor. Would you like to switch there?';
        break;
      }
      case 'MERGE_PDF': {
        result.actions.push({
          type: 'MERGE_PDF',
          priority: 'high',
          parameters: {}
        });
        break;
      }
      case 'SUMMARIZE_DOCUMENT': {
        result.actions.push({
          type: 'ANALYZE_DOCUMENT',
          priority: 'low',
          parameters: { mode: 'summarize' }
        });
        break;
      }
      case 'ANALYZE_DOCUMENT': {
        result.actions.push({
          type: 'ANALYZE_DOCUMENT',
          priority: 'low',
          parameters: { mode: 'analyze' }
        });
        break;
      }
      case 'EXTRACT_DATA': {
        result.actions.push({
          type: 'EXTRACT_DATA',
          priority: 'normal',
          parameters: { format: 'json' }
        });
        break;
      }
      case 'OCR_DOCUMENT': {
        result.actions.push({
          type: 'OCR_DOCUMENT',
          priority: 'normal',
          parameters: { language: 'eng' }
        });
        break;
      }
      case 'CROP_PAGES': {
        const pages = text.includes('all') || text.includes('every') || extractedPages.pages.length === 0 ? 'all' : extractedPages.pages;
        result.actions.push({
          type: 'CROP_PAGES',
          priority: 'normal',
          parameters: {
            pages,
            margin: extractedConstraints.margin || 0
          }
        });
        break;
      }
      case 'INSERT_PAGES': {
        result.needs_clarification = true;
        result.clarification_question = 'After which page should I insert the blank page(s)? E.g., "after page 3"';
        break;
      }
      case 'DUPLICATE_PAGES': {
        if (extractedPages.pages.length === 0) {
          result.needs_clarification = true;
          result.clarification_question = 'Which pages would you like to duplicate? E.g., "duplicate page 2" or "copy pages 1-3"';
        } else {
          result.actions.push({
            type: 'DUPLICATE_PAGES',
            priority: 'normal',
            parameters: { pages: extractedPages.pages }
          });
        }
        break;
      }
      case 'REMOVE_DUPLICATES': {
        result.actions.push({
          type: 'REMOVE_DUPLICATES',
          priority: 'high',
          parameters: {}
        });
        break;
      }
      case 'ENCRYPT_PDF': {
        result.needs_clarification = true;
        result.clarification_question = 'What password would you like to use for encryption? Please provide it in quotes.';
        break;
      }
      case 'UNLOCK_PDF': {
        result.needs_clarification = true;
        result.clarification_question = 'What is the password for this encrypted PDF?';
        break;
      }
      case 'ROTATE_CLOCKWISE': {
        const pages = text.includes('all') || text.includes('every') || extractedPages.pages.length === 0 ? 'all' : extractedPages.pages;
        result.actions.push({
          type: 'ROTATE_PAGES',
          priority: 'normal',
          parameters: { pages, degree: 90 }
        });
        break;
      }
      case 'ROTATE_COUNTER_CLOCKWISE': {
        const pages = text.includes('all') || text.includes('every') || extractedPages.pages.length === 0 ? 'all' : extractedPages.pages;
        result.actions.push({
          type: 'ROTATE_PAGES',
          priority: 'normal',
          parameters: { pages, degree: 270 }
        });
        break;
      }
    }

    return result;
  }

  resolveContext(normalized, history) {
    if (!history || history.length === 0) return null;

    let lastAiMsg = null;
    let lastActionMsg = null;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].sender === 'ai') {
        if (!lastAiMsg) lastAiMsg = history[i];
        if (!lastActionMsg && history[i].intent && !['GREETING', 'ERROR', 'FILE_LOADED'].includes(history[i].intent)) {
          lastActionMsg = history[i];
        }
      }
    }

    if (!lastAiMsg) return null;

    const sizeFollowUp = /\b(smaller|lighter|more compressed|compress more|under|below|email friendly)\b/.test(normalized);
    if (sizeFollowUp) {
      const constraints = this.extractConstraints(normalized);
      return {
        intent: 'COMPRESS',
        confidence: 0.88,
        entities: { pages: [], ranges: [], constraints },
        actions: [{
          type: 'COMPRESS',
          priority: 'normal',
          parameters: {
            quality: constraints.quality || 'balanced',
            level: constraints.level || 'medium',
            maxSize: constraints.maxSize || null,
            sizeUnit: constraints.sizeUnit || null
          }
        }],
        needs_clarification: false
      };
    }

    const rotationFollowUp = /\b(turn|rotate|sideways|upside down|clockwise|counterclockwise|left|right)\b/.test(normalized);
    if (rotationFollowUp && /\b(it|this|that|page|pages|all)\b/.test(normalized)) {
      const extracted = this.extractPagesAndRanges(normalized);
      return {
        intent: 'ROTATE_PAGES',
        confidence: 0.86,
        entities: extracted,
        actions: [{
          type: 'ROTATE_PAGES',
          priority: 'normal',
          parameters: {
            pages: /\ball|every|it|this|that\b/.test(normalized) || extracted.pages.length === 0 ? 'all' : extracted.pages,
            degree: this.extractAngle(normalized) || 90
          }
        }],
        needs_clarification: false
      };
    }

    const reuseLastPages = /\b(same pages?|those pages?|them)\b/.test(normalized) && lastActionMsg?.entities?.pages?.length;
    if (reuseLastPages) {
      const direct = this.getDirectPhraseMatch(normalized);
      if (direct) {
        const segment = this.parseSegment(normalized.replace(/\b(same pages?|those pages?|them)\b/g, `pages ${lastActionMsg.entities.pages.join(',')}`));
        if (segment.intent !== 'Unknown') {
          return {
            intent: segment.intent,
            confidence: Math.max(segment.confidence, 0.82),
            entities: segment.entities,
            actions: segment.actions,
            needs_clarification: segment.needs_clarification,
            clarification_question: segment.clarification_question
          };
        }
      }
    }

    if (lastAiMsg.text && lastAiMsg.text.includes('🤔')) {
      const prevIntent = lastAiMsg.intent;

      const isAffirmation = /\b(?:yes|do\s+it|sure|go\s+ahead|ok|confirm|please|yep|yeah|indeed|correct|right|proceed|continue)\b/.test(normalized);

      if (isAffirmation) {
        if (prevIntent === 'DELETE_PAGES') {
          return {
            intent: 'DELETE_PAGES',
            confidence: 0.95,
            entities: { pages: 'all', ranges: [] },
            actions: [{ type: 'DELETE_PAGES', priority: 'normal', parameters: { pages: 'all' } }],
            needs_clarification: false
          };
        }
        if (prevIntent === 'ADD_WATERMARK') {
          return {
            intent: 'ADD_WATERMARK',
            confidence: 0.95,
            entities: { pages: 'all', ranges: [] },
            actions: [{ type: 'ADD_WATERMARK', priority: 'normal', parameters: { text: 'CONFIDENTIAL' } }],
            needs_clarification: false
          };
        }
        if (prevIntent === 'ENHANCE_SCAN') {
          return {
            intent: 'REDIRECT_SCANNER',
            confidence: 0.95,
            actions: [{ type: 'REDIRECT', target: 'scanner' }],
            needs_clarification: false
          };
        }
        if (prevIntent === 'REORDER_PAGES') {
          return {
            intent: 'REDIRECT_EDITOR',
            confidence: 0.95,
            actions: [{ type: 'REDIRECT', target: 'editor' }],
            needs_clarification: false
          };
        }
        if (prevIntent === 'ADD_TEXT') {
          return {
            intent: 'ADD_TEXT',
            confidence: 0.95,
            entities: { pages: 'all', ranges: [] },
            actions: [{ type: 'ADD_TEXT', priority: 'normal', parameters: { text: lastAiMsg.extractedText || 'TEXT', pages: 'all' } }],
            needs_clarification: false
          };
        }
      }

      const isNegative = /\b(?:no|nope|nah|never|cancel|stop|dont|don't|not)\b/.test(normalized);
      if (isNegative) {
        return {
          intent: 'CANCELLED',
          confidence: 0.95,
          entities: {},
          actions: [],
          needs_clarification: false,
          clarification_question: 'Cancelled. Is there anything else I can help with?'
        };
      }

      const extracted = this.extractPagesAndRanges(normalized);
      if (extracted.pages.length > 0) {
        if (prevIntent === 'DELETE_PAGES') {
          return {
            intent: 'DELETE_PAGES',
            confidence: 0.95,
            entities: extracted,
            actions: [{ type: 'DELETE_PAGES', priority: 'normal', parameters: { pages: extracted.pages } }],
            needs_clarification: false
          };
        }
        if (prevIntent === 'EXTRACT_PAGES') {
          return {
            intent: 'EXTRACT_PAGES',
            confidence: 0.95,
            entities: extracted,
            actions: [{ type: 'EXTRACT_PAGES', priority: 'normal', parameters: { pages: extracted.pages } }],
            needs_clarification: false
          };
        }
        if (prevIntent === 'SPLIT_PDF') {
          return {
            intent: 'SPLIT_PDF',
            confidence: 0.95,
            entities: extracted,
            actions: [{ type: 'SPLIT_PDF', priority: 'normal', parameters: { afterPage: extracted.pages[0] } }],
            needs_clarification: false
          };
        }
      }

      const quoted = this.extractQuotes(normalized);
      if (quoted && prevIntent === 'ADD_TEXT') {
        return {
          intent: 'ADD_TEXT',
          confidence: 0.95,
          entities: { pages: 'all', ranges: [] },
          actions: [{ type: 'ADD_TEXT', priority: 'normal', parameters: { text: quoted, pages: 'all' } }],
          needs_clarification: false
        };
      }

      if (quoted && prevIntent === 'ADD_WATERMARK') {
        return {
          intent: 'ADD_WATERMARK',
          confidence: 0.95,
          entities: { pages: 'all', ranges: [] },
          actions: [{ type: 'ADD_WATERMARK', priority: 'normal', parameters: { text: quoted } }],
          needs_clarification: false
        };
      }
    }

    return null;
  }

  extractPagesAndRanges(text) {
    const pages = [];
    const ranges = [];

    const rangeRegex = /\b(\d+)\s*(?:-|to|through)\s*(\d+)\b/g;
    let match;
    while ((match = rangeRegex.exec(text)) !== null) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        ranges.push(`${start}-${end}`);
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
      }
    }

    let textWithoutRanges = text.replace(rangeRegex, '');
    textWithoutRanges = textWithoutRanges.replace(/\b(?:90|180|270|360)\b/g, '');

    const pageRegex = /\b(?:page|pages|p\.)?\s*(\d+)\b/g;
    while ((match = pageRegex.exec(textWithoutRanges)) !== null) {
      const pageNum = parseInt(match[1], 10);
      if (!isNaN(pageNum) && !pages.includes(pageNum)) {
        pages.push(pageNum);
      }
    }

    const ordinalRegex = new RegExp(`\\b(?:page\\s+)?(${Object.keys(this.ordinalNumbers).join('|')})\\b`, 'g');
    while ((match = ordinalRegex.exec(textWithoutRanges)) !== null) {
      const pageValue = this.ordinalNumbers[match[1]];
      if (typeof pageValue === 'number' && !pages.includes(pageValue)) {
        pages.push(pageValue);
      }
    }

    pages.sort((a, b) => a - b);
    return { pages, ranges };
  }

  extractQuotes(text) {
    const quoteRegex = /["']([^"']+)["']/;
    const match = text.match(quoteRegex);
    if (match) return match[1];

    const sayingMatch = text.match(/(?:stamp|saying|text|watermark|write|label)\s+([a-zA-Z0-9_\-\s]{2,24})/);
    if (sayingMatch) return sayingMatch[1].trim();

    return null;
  }

  extractAngle(text) {
    if (/\b90\b|clockwise/.test(text)) return 90;
    if (/\b180\b|upside/.test(text)) return 180;
    if (/\b270\b|counter/.test(text)) return 270;
    return null;
  }

  extractPosition(text) {
    if (/\btop\b/.test(text)) return 'top';
    if (/\bbottom\b/.test(text)) return 'bottom';
    if (/\bmiddle|half|center\b/.test(text)) return 'half';
    return null;
  }

  extractConstraints(text) {
    const constraints = {};

    const sizeMatch = text.match(/\b(?:below|under|less\s+than|max|maximum|at\s+most|to)\s+(\d+(?:\.\d+)?)\s*(m|mb|meg|megabytes|k|kb|kilobytes|g|gb|gigabytes)\b/i);
    if (sizeMatch) {
      constraints.maxSize = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toLowerCase();
      constraints.sizeUnit = { m: 'mb', meg: 'mb', k: 'kb', g: 'gb' }[unit] || unit;
    }

    if (/\b(?:email friendly|shareable|smallest|very small|lightest|aggressive)\b/.test(text)) {
      constraints.quality = 'low';
      constraints.level = 'high';
    } else if (/\b(?:high|maximum|max|best|highest|full)\b/.test(text)) {
      constraints.quality = 'high';
      constraints.level = 'low';
    } else if (/\b(?:low|extreme|minimum|smallest|very small|lightest|aggressive|maximum)\b/.test(text)) {
      constraints.quality = 'low';
      constraints.level = 'high';
    } else {
      constraints.quality = 'balanced';
      constraints.level = 'medium';
    }

    return constraints;
  }
}

module.exports = new AiParserService();
