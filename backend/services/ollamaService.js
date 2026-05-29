class NlpService {
  constructor() {
    this._ready = false;
    this._langchain = null;
    this._intents = [
      'COMPRESS', 'DELETE_PAGES', 'DELETE_BLANK_PAGES', 'ROTATE_PAGES',
      'SPLIT_PDF', 'MERGE_PDF', 'EXTRACT_PAGES', 'ADD_WATERMARK',
      'ADD_TEXT', 'ADD_PAGE_NUMBERS', 'REDACT_TEXT', 'CROP_PAGES',
      'DUPLICATE_PAGES', 'REMOVE_DUPLICATES', 'OCR_DOCUMENT',
      'REORDER_PAGES', 'FLIP_PAGES', 'ENCRYPT_PDF', 'DECRYPT_PDF',
      'OPTIMIZE_SCAN', 'ENHANCE_CONTRAST', 'DESKEW', 'ANALYZE_DOCUMENT',
    ];
    this._patterns = this._buildPatterns();
  }

  _getLangchain() {
    if (!this._langchain) this._langchain = require('./langchainService');
    return this._langchain;
  }

  async parsePdfCommand(command, context = {}) {
    const lc = this._getLangchain();
    if (lc.isAvailable) {
      try {
        const result = await lc.parseCommand(command, context);
        if (result && result.intent && result.intent !== 'UNKNOWN') {
          console.log('[parse] LangChain: ' + result.intent);
          return { ...this.normalizeParseResult(result, command), source: 'langchain' };
        }
      } catch {}
    }
    const fb = this.fallbackParsePdfCommand(command, context);
    console.log('[parse] Local: ' + fb.intent);
    return { ...fb, source: 'local' };
  }

  async analyzeDocument(text, maxLength = 2000) {
    const lc = this._getLangchain();
    if (lc.isAvailable) {
      const r = await lc.analyzeDocument(text, maxLength);
      if (r) return { analysis: r, source: 'langchain' };
    }
    return { analysis: null, source: 'local' };
  }

  async generateOcrSuggestions() {
    return { suggestions: [], source: 'local' };
  }

  async testConnection() {
    return { success: true, message: 'Local NLP parser active', mode: 'local' };
  }

  static _e(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _buildPatterns() {
    return [
      { words: ['delete', 'blank'],                     intent: 'DELETE_BLANK_PAGES', c: 0.88 },
      { words: ['remove', 'blank'],                     intent: 'DELETE_BLANK_PAGES', c: 0.88 },
      { words: ['remove', 'duplicate'],                 intent: 'REMOVE_DUPLICATES',  c: 0.87 },
      { words: ['delete', 'duplicate'],                 intent: 'REMOVE_DUPLICATES',  c: 0.87 },
      { words: ['add', 'watermark'],                    intent: 'ADD_WATERMARK',      c: 0.85 },
      { words: ['add', 'page', 'number'],               intent: 'ADD_PAGE_NUMBERS',   c: 0.88 },
      { words: ['add', 'text'],                         intent: 'ADD_TEXT',           c: 0.82 },
      { words: ['add', 'stamp'],                        intent: 'ADD_TEXT',           c: 0.80 },
      { words: ['enhance', 'contrast'],                 intent: 'ENHANCE_CONTRAST',   c: 0.85 },
      { words: ['optimize', 'scan'],                    intent: 'OPTIMIZE_SCAN',      c: 0.82 },
      { words: ['reorder', 'page'],                     intent: 'REORDER_PAGES',      c: 0.85 },
      { words: ['rearrange', 'page'],                   intent: 'REORDER_PAGES',      c: 0.85 },
      { words: ['flip', 'page'],                        intent: 'FLIP_PAGES',         c: 0.82 },
      { words: ['flip', 'horizontal'],                  intent: 'FLIP_PAGES',         c: 0.82 },
      { words: ['flip', 'vertical'],                    intent: 'FLIP_PAGES',         c: 0.82 },
      { words: ['straighten'],                          intent: 'DESKEW',             c: 0.80 },
      { words: ['deskew'],                              intent: 'DESKEW',             c: 0.85 },
      { words: ['encrypt'],                             intent: 'ENCRYPT_PDF',        c: 0.82 },
      { words: ['lock'],                                intent: 'ENCRYPT_PDF',        c: 0.75 },
      { words: ['password', 'protect'],                 intent: 'ENCRYPT_PDF',        c: 0.85 },
      { words: ['decrypt'],                             intent: 'DECRYPT_PDF',        c: 0.82 },
      { words: ['unlock'],                              intent: 'DECRYPT_PDF',        c: 0.80 },
      { words: ['remove', 'password'],                  intent: 'DECRYPT_PDF',        c: 0.85 },
      { words: ['compress'],                            intent: 'COMPRESS',           c: 0.80 },
      { words: ['smaller'],                             intent: 'COMPRESS',           c: 0.72 },
      { words: ['reduce'],                              intent: 'COMPRESS',           c: 0.70 },
      { words: ['shrink'],                              intent: 'COMPRESS',           c: 0.68 },
      { words: ['minify'],                              intent: 'COMPRESS',           c: 0.65 },
      { words: ['delete'],                              intent: 'DELETE_PAGES',       c: 0.70 },
      { words: ['remove'],                              intent: 'DELETE_PAGES',       c: 0.68 },
      { words: ['erase'],                               intent: 'DELETE_PAGES',       c: 0.65 },
      { words: ['discard'],                             intent: 'DELETE_PAGES',       c: 0.60 },
      { words: ['rotate'],                              intent: 'ROTATE_PAGES',       c: 0.80 },
      { words: ['spin'],                                intent: 'ROTATE_PAGES',       c: 0.70 },
      { words: ['turn'],                                intent: 'ROTATE_PAGES',       c: 0.65 },
      { words: ['flip'],                                intent: 'ROTATE_PAGES',       c: 0.60 },
      { words: ['split'],                               intent: 'SPLIT_PDF',          c: 0.80 },
      { words: ['separate'],                            intent: 'SPLIT_PDF',          c: 0.75 },
      { words: ['divide'],                              intent: 'SPLIT_PDF',          c: 0.72 },
      { words: ['cut'],                                 intent: 'SPLIT_PDF',          c: 0.60 },
      { words: ['merge'],                               intent: 'MERGE_PDF',          c: 0.80 },
      { words: ['combine'],                             intent: 'MERGE_PDF',          c: 0.78 },
      { words: ['join'],                                intent: 'MERGE_PDF',          c: 0.75 },
      { words: ['append'],                              intent: 'MERGE_PDF',          c: 0.65 },
      { words: ['extract'],                             intent: 'EXTRACT_PAGES',      c: 0.78 },
      { words: ['take'],                                intent: 'EXTRACT_PAGES',      c: 0.55 },
      { words: ['pull'],                                intent: 'EXTRACT_PAGES',      c: 0.55 },
      { words: ['crop'],                                intent: 'CROP_PAGES',         c: 0.78 },
      { words: ['trim'],                                intent: 'CROP_PAGES',         c: 0.65 },
      { words: ['margin'],                              intent: 'CROP_PAGES',         c: 0.60 },
      { words: ['redact'],                              intent: 'REDACT_TEXT',        c: 0.80 },
      { words: ['hide'],                                intent: 'REDACT_TEXT',        c: 0.60 },
      { words: ['blackout'],                            intent: 'REDACT_TEXT',        c: 0.75 },
      { words: ['censor'],                              intent: 'REDACT_TEXT',        c: 0.78 },
      { words: ['cover'],                               intent: 'REDACT_TEXT',        c: 0.55 },
      { words: ['duplicate'],                           intent: 'DUPLICATE_PAGES',    c: 0.78 },
      { words: ['copy', 'page'],                        intent: 'DUPLICATE_PAGES',    c: 0.82 },
      { words: ['clone'],                               intent: 'DUPLICATE_PAGES',    c: 0.78 },
      { words: ['repeat'],                              intent: 'DUPLICATE_PAGES',    c: 0.60 },
      { words: ['ocr'],                                 intent: 'OCR_DOCUMENT',       c: 0.85 },
      { words: ['recognize', 'text'],                   intent: 'OCR_DOCUMENT',       c: 0.82 },
      { words: ['scan'],                                intent: 'OCR_DOCUMENT',       c: 0.65 },
      { words: ['analyze'],                             intent: 'ANALYZE_DOCUMENT',   c: 0.70 },
      { words: ['summarize'],                           intent: 'ANALYZE_DOCUMENT',   c: 0.65 },
      { words: ['classify'],                            intent: 'ANALYZE_DOCUMENT',   c: 0.60 },
      { words: ['inspect'],                             intent: 'ANALYZE_DOCUMENT',   c: 0.55 },
    ];
  }

  _matchWord(cmd, word) {
    // Match with or without trailing s/es/ed/ing for plurals
    return new RegExp('\\b' + NlpService._e(word) + '(?:s|es|ed|ing)?\\b', 'i').test(cmd);
  }

  _extractPages(cmd) {
    const pages = new Set();
    // Extract numbers after "page"/"pages" keyword
    const pageBlock = cmd.match(/\bpages?\s+([\d,\s\-–andto]+)/i);
    if (pageBlock) {
      pageBlock[1].split(/[,;]\s*|\s+and\s+|\s+to\s+|\s*[-–]\s*|\s+/)
        .map(s => s.trim()).filter(Boolean).forEach(s => {
          const n = parseInt(s, 10);
          if (!isNaN(n) && n > 0) pages.add(n);
        });
    }
    // Ranges like "1-5" or "1 to 5" anywhere in command
    const rr = /\b(\d+)\s*(?:[-–]|to)\s*(\d+)\b/g;
    let m;
    while ((m = rr.exec(cmd)) !== null) {
      const s = parseInt(m[1], 10), e = parseInt(m[2], 10);
      for (let i = Math.min(s, e); i <= Math.max(s, e); i++) pages.add(i);
    }
    // Single "page X" (also catches if pageBlock missed it)
    const sm = cmd.match(/\bpage\s+(\d+)\b/i);
    if (sm) { const p = parseInt(sm[1], 10); if (p > 0) pages.add(p); }
    // Ordinals
    const ord = { first:1, second:2, third:3, fourth:4, fifth:5, sixth:6, seventh:7, eighth:8, ninth:9, tenth:10 };
    for (const [w, n] of Object.entries(ord)) {
      if (new RegExp('\\b' + w + '\\b', 'i').test(cmd)) pages.add(n);
    }
    const sorted = [...pages].sort((a, b) => a - b);
    const all = /\b(all|every|entire|whole)\b/i.test(cmd);
    return { pages: sorted, allPages: all || (sorted.length === 0 && !/\bpages?\b/i.test(cmd)) };
  }

  fallbackParsePdfCommand(command) {
    const cmd = command.trim();
    const { pages, allPages } = this._extractPages(cmd);
    const mw = (w) => this._matchWord(cmd, w);

    let best = { intent: 'UNKNOWN', confidence: 0, matched: [] };
    for (const p of this._patterns) {
      if (p.words.every(w => mw(w))) {
        const score = p.c + (p.words.length > 1 ? 0.05 : 0) + (pages.length > 0 ? 0.02 : 0);
        if (score > best.confidence) best = { intent: p.intent, confidence: score, matched: p.words };
      }
    }

    // Parameter extraction
    const degRe = /\b(90|180|270|360)\s*(?:degree|°|deg)/i;
    const dm = cmd.match(degRe);
    let degree = dm ? parseInt(dm[1], 10) : null;
    if (degree === null && best.intent === 'ROTATE_PAGES') {
      const ld = cmd.match(/\b(45|90|180|270|360)\b/);
      if (ld) degree = parseInt(ld[1], 10);
      else degree = 90;
    }

    const qRe = /quality\s*(\d+)/i;
    const qm = cmd.match(qRe) || cmd.match(/(\d+)%\s*(?:quality|compress)/i);
    const quality = qm ? Math.min(100, Math.max(1, parseInt(qm[1], 10))) : null;

    const dpiRe = /dpi\s*(\d+)/i;
    const dpim = cmd.match(dpiRe) || cmd.match(/(\d+)\s*dpi/i);
    const dpi = dpim ? Math.min(600, Math.max(72, parseInt(dpim[1], 10))) : null;

    const tq = cmd.match(/["\u201C\u201D]([^"\u201C\u201D]+)["\u201C\u201D]/);
    const textInQuotes = tq ? tq[1] : null;
    const watermarkText = textInQuotes || (cmd.match(/confidential/i) ? 'CONFIDENTIAL' : null) || (cmd.match(/draft/i) ? 'DRAFT' : null) || 'DRAFT';

    const afterRe = /(?:after|at)\s+page\s+(\d+)/i;
    const afterPage = cmd.match(afterRe);
    const splitAt = afterPage ? parseInt(afterPage[1], 10) : (cmd.match(/half/i) ? 'half' : 1);

    const posRe = /\b(top|bottom|center|middle|left|right)\b/i;
    const posM = cmd.match(posRe);
    const position = posM ? posM[1].toLowerCase() : 'top';

    const pwdRe = /password\s+["\u201C\u201D]?([^"\u201C\u201D\s]+)["\u201C\u201D]?/i;
    const pwdM = cmd.match(pwdRe);
    const password = pwdM ? pwdM[1] : null;

    const dirRe = /\b(clockwise|cw|anticlockwise|ccw|counterclockwise)\b/i;
    const dirM = cmd.match(dirRe);
    let direction = null;
    if (dirM) {
      const d = dirM[1].toLowerCase();
      direction = (d === 'clockwise' || d === 'cw') ? 'clockwise' : 'counterclockwise';
    }

    const result = {
      intent: best.intent,
      confidence: Math.round(best.confidence * 100) / 100,
      entities: {
        pages,
        parameters: {
          ...(degree !== null && { degree }),
          ...(quality !== null && { quality }),
          ...(dpi !== null && { dpi }),
          ...(position !== null && { position }),
          ...(direction !== null && { direction }),
          ...(password !== null && { password }),
          ...(watermarkText !== null && { text: watermarkText }),
          ...((best.intent === 'SPLIT_PDF') && { afterPage: splitAt }),
        }
      },
      needs_clarification: best.intent === 'UNKNOWN' || (['DELETE_PAGES', 'EXTRACT_PAGES', 'DUPLICATE_PAGES'].includes(best.intent) && pages.length === 0 && !allPages),
      clarification_question: ''
    };

    if (result.needs_clarification) {
      if (best.intent === 'UNKNOWN') result.clarification_question = 'Could you rephrase what you want to do with the PDF?';
      else result.clarification_question = 'Which pages would you like to use for ' + best.intent.replace(/_/g, ' ').toLowerCase() + '?';
    }

    return this.normalizeParseResult(result, command);
  }

  normalizeParseResult(result, originalCommand = '') {
    const alias = {
      DELETE: 'DELETE_PAGES', ROTATE: 'ROTATE_PAGES', SPLIT: 'SPLIT_PDF',
      WATERMARK: 'ADD_WATERMARK', REDACT: 'REDACT_TEXT', EXTRACT: 'EXTRACT_PAGES',
      MERGE: 'MERGE_PDF', OCR: 'OCR_DOCUMENT', COPY: 'DUPLICATE_PAGES',
      DUPLICATE: 'DUPLICATE_PAGES', FLIP: 'FLIP_PAGES', REORDER: 'REORDER_PAGES',
      ENCRYPT: 'ENCRYPT_PDF', DECRYPT: 'DECRYPT_PDF', COMPRESS: 'COMPRESS',
      ANALYZE: 'ANALYZE_DOCUMENT', CROP: 'CROP_PAGES', DESKEW: 'DESKEW',
    };
    const intent = alias[result.intent] || result.intent || 'UNKNOWN';
    const entities = result.entities || {};
    const params = entities.parameters || {};
    const pages = Array.isArray(entities.pages) ? entities.pages.map(Number).filter(Boolean) : [];
    const lower = originalCommand.toLowerCase();
    const hasAll = /\b(all|every|entire|whole)\b/.test(lower);
    const allPages = hasAll || (pages.length === 0 && !/\bpages?\b/i.test(originalCommand));

    const build = (type) => {
      switch (type) {
        case 'COMPRESS':
          return { type, priority: 'normal', parameters: { quality: params.quality || 50, ...(params.dpi && { dpi: params.dpi }) } };
        case 'DELETE_PAGES':
          return { type, priority: 'normal', parameters: { pages: allPages ? 'all' : pages } };
        case 'DELETE_BLANK_PAGES':
          return { type, priority: 'high', parameters: {} };
        case 'ROTATE_PAGES':
          return { type, priority: 'normal', parameters: { pages: allPages ? 'all' : pages, degree: params.degree || 90, ...(params.direction && { direction: params.direction }) } };
        case 'EXTRACT_PAGES':
          return { type, priority: 'normal', parameters: { pages } };
        case 'SPLIT_PDF':
          return { type, priority: 'normal', parameters: { afterPage: params.afterPage || 1 } };
        case 'ADD_WATERMARK':
          return { type, priority: 'normal', parameters: { text: params.text || 'DRAFT', position: params.position || 'center', opacity: 0.3 } };
        case 'ADD_TEXT':
          return { type, priority: 'normal', parameters: { text: params.text || '', pages: allPages || pages.length === 0 ? 'all' : pages, position: params.position || 'top' } };
        case 'ADD_PAGE_NUMBERS':
          return { type, priority: 'normal', parameters: { position: params.position || 'bottom', startFrom: 1 } };
        case 'REDACT_TEXT':
          return { type, priority: 'normal', parameters: { pages: allPages ? 'all' : pages, position: params.position || 'top' } };
        case 'CROP_PAGES':
          return { type, priority: 'normal', parameters: { pages: allPages ? 'all' : pages, margin: params.margin || 0, position: params.position || 'all' } };
        case 'DUPLICATE_PAGES':
          return { type, priority: 'normal', parameters: { pages } };
        case 'REMOVE_DUPLICATES':
          return { type, priority: 'normal', parameters: {} };
        case 'OCR_DOCUMENT':
          return { type, priority: 'normal', parameters: { ...(params.dpi && { dpi: params.dpi }), ...(params.language && { language: params.language }) } };
        case 'REORDER_PAGES':
          return { type, priority: 'normal', parameters: { order: pages.length > 0 ? pages : 'reverse' } };
        case 'FLIP_PAGES':
          return { type, priority: 'normal', parameters: { pages: allPages ? 'all' : pages, axis: params.axis || 'horizontal' } };
        case 'ENCRYPT_PDF':
          return { type, priority: 'high', parameters: { password: params.password || 'default' } };
        case 'DECRYPT_PDF':
          return { type, priority: 'high', parameters: { password: params.password || '' } };
        case 'OPTIMIZE_SCAN':
          return { type, priority: 'normal', parameters: { ...(params.dpi && { dpi: params.dpi }), contrast: true, despeckle: true } };
        case 'ENHANCE_CONTRAST':
          return { type, priority: 'normal', parameters: { level: params.level || 'auto' } };
        case 'DESKEW':
          return { type, priority: 'normal', parameters: {} };
        case 'ANALYZE_DOCUMENT':
          return { type, priority: 'normal', parameters: {} };
        default:
          return { type, priority: 'normal', parameters: {} };
      }
    };

    const actions = Array.isArray(result.actions) && result.actions.length
      ? result.actions.map(a => ({ ...a, type: alias[a.type] || a.type, parameters: a.parameters || {} })).filter(a => build(a.type))
      : [build(intent)].filter(Boolean);

    const missingPages = ['DELETE_PAGES', 'EXTRACT_PAGES', 'DUPLICATE_PAGES'].includes(intent) && !allPages && pages.length === 0;

    return {
      intent,
      confidence: Math.min(0.98, Number(result.confidence || 0.3)),
      entities: { ...entities, pages },
      actions,
      needs_clarification: Boolean(result.needs_clarification) || missingPages,
      clarification_question: result.clarification_question || (missingPages ? 'Which pages should I ' + intent.replace(/_/g, ' ').toLowerCase() + '?' : '')
    };
  }
}

module.exports = new NlpService();
