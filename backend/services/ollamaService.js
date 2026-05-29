class OllamaService {
  constructor() {
    this.baseUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama2';
    this.timeout = 300000;
    this._available = null;
    this._lastCheck = 0;
    this.aiServiceUrl = process.env.AI_SERVICE_URL || '';
    this.aiServiceToken = process.env.AI_SERVICE_API_TOKEN || '';
    this._aiServiceAvailable = null;
    this._aiServiceLastCheck = 0;
    this._skipOllama = !process.env.OLLAMA_DEPLOYED && this.baseUrl.includes('localhost');
    this._langchain = null;
  }

  _getLangchain() {
    if (!this._langchain) this._langchain = require('./langchainService');
    return this._langchain;
  }

  async _callAiService(endpoint, body = {}) {
    if (!this.aiServiceUrl) return null;
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.aiServiceToken) headers['Authorization'] = `Bearer ${this.aiServiceToken}`;
      const response = await fetch(`${this.aiServiceUrl}/api/v1/ai/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async _isAiServiceAvailable() {
    if (!this.aiServiceUrl) return false;
    if (this._aiServiceAvailable !== null && Date.now() - this._aiServiceLastCheck < 60000) {
      return this._aiServiceAvailable;
    }
    try {
      const response = await fetch(`${this.aiServiceUrl}/api/v1/ai/health`, {
        signal: AbortSignal.timeout(5000)
      });
      this._aiServiceAvailable = response.ok;
      this._aiServiceLastCheck = Date.now();
      return response.ok;
    } catch {
      this._aiServiceAvailable = false;
      this._aiServiceLastCheck = Date.now();
      return false;
    }
  }

  _normalizeServiceResult(result) {
    return {
      intent: result.intent,
      confidence: result.confidence,
      entities: { pages: result.entities?.filter(e => e.type === 'page_number').map(e => e.value) || [], parameters: {} },
      actions: (result.actions || []).map(a => ({
        type: a.type,
        priority: a.priority > 0 ? 'high' : 'normal',
        parameters: a.parameters || {}
      })),
      needs_clarification: result.needs_clarification || false,
      clarification_question: result.clarification_question || ''
    };
  }

  _safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch (_) {}

    let cleaned = text
      .replace(/\/\/.*$/gm, '')                 // remove single-line comments
      .replace(/,\s*([}\]])/g, '$1')             // remove trailing commas
      .replace(/(['"])?([a-zA-Z_][a-zA-Z0-9_]*)(['"])?\s*:/g, '"$2":')  // quote bare keys
      .replace(/'/g, '"')                        // single quotes -> double quotes
      .replace(/\b(null|true|false)\b/g, (m) => m.toLowerCase()) // lowercase booleans
      .replace(/,\s*,/g, ',')                    // remove double commas
      .replace(/\\(?!["\\\/bfnrtu])/g, '')       // remove invalid escapes
      .replace(/\s+/g, ' ')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (_) {}

    return null;
  }

  _isAvailableCached() {
    if (this._available !== null && Date.now() - this._lastCheck < 15000) {
      return this._available;
    }
    return null;
  }

  _setAvailable(val) {
    this._available = val;
    this._lastCheck = Date.now();
  }

  async request(path, options = {}, timeoutMs = this.timeout) {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });

      const data = await response.json().catch(() => ({}));
      return { status: response.status, ok: response.ok, data };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Timeout after ${timeoutMs}ms connecting to ${url}`);
      }
      throw new Error(`${error.message} (trying ${url})`);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Check if Ollama service is available
   */
  async isAvailable() {
    if (this._skipOllama) return false;
    const cached = this._isAvailableCached();
    if (cached !== null) return cached;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await this.request('/api/tags', { method: 'GET' }, 10000);
        const ok = response.ok && response.data.models && response.data.models.length > 0;
        if (ok) {
          this._setAvailable(true);
          return true;
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
      } catch {
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
      }
    }
    this._setAvailable(false);
    return false;
  }

  /**
   * Parse natural language PDF command using AI Service or Ollama
   */
  async parsePdfCommand(command, context = {}) {
    // 1. Try LangChain
    const lc = this._getLangchain();
    if (lc.isAvailable) {
      const result = await lc.parseCommand(command, context);
      if (result && result.intent && result.intent !== 'UNKNOWN') {
        console.log(`[parse] LangChain OK: ${result.intent}`);
        return { ...this.normalizeParseResult(result, command), source: 'langchain' };
      }
      console.log(`[parse] LangChain failed (result=${JSON.stringify(result)}), trying next`);
    } else {
      console.log('[parse] LangChain unavailable, trying next');
    }

    // 2. Try direct Ollama
    if (await this.isAvailable()) {
      try {
        console.log(`[parse] Calling Ollama /api/generate (model=${this.model})`);
        const prompt = `Parse this PDF editing command into JSON. Intent must be one of: COMPRESS, DELETE_PAGES, DELETE_BLANK_PAGES, ROTATE_PAGES, SPLIT_PDF, ADD_WATERMARK, ADD_TEXT, REDACT_TEXT, EXTRACT_PAGES, MERGE_PDF, OCR_DOCUMENT, CROP_PAGES, DUPLICATE_PAGES, REMOVE_DUPLICATES. Command: "${command}". Return only valid JSON with keys: intent, confidence, actions, entities, needs_clarification, clarification_question.`;

        const response = await this.request('/api/generate', {
          method: 'POST',
          body: JSON.stringify({ model: this.model, prompt, stream: false, temperature: 0.3 })
        });

        if (response.data?.response) {
          const jsonMatch = response.data.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = this._safeJsonParse(jsonMatch[0]);
            if (parsed) {
              console.log(`[parse] Ollama OK: ${parsed.intent}`);
              return { ...this.normalizeParseResult(parsed, command), source: 'ollama', parseTime: new Date() };
            }
          }
        }
        console.log(`[parse] Ollama returned no valid JSON, trying fallback`);
      } catch (e) {
        console.log(`[parse] Ollama error: ${e.message}, trying fallback`);
      }
    } else {
      console.log('[parse] Ollama not available, trying fallback');
    }

    // 3. Rule-based fallback (always works)
    const fb = this.fallbackParsePdfCommand(command, context);
    console.log(`[parse] Fallback: ${fb.intent}`);
    return { ...fb, source: 'fallback' };
  }

  async analyzeDocument(text, maxLength = 2000) {
    const lc = this._getLangchain();
    if (lc.isAvailable) {
      const result = await lc.analyzeDocument(text, maxLength);
      if (result) return { analysis: result, source: 'langchain' };
    }
    if (await this._isAiServiceAvailable()) {
      const result = await this._callAiService('analyze-document', { text, max_length: maxLength });
      if (result) return { analysis: { documentType: result.document_type, topics: [], entities: result.entities || [], ocrQuality: 'medium' }, source: 'ai-service' };
    }
    if (await this.isAvailable()) {
      try {
        const prompt = `Analyze this document text. Return JSON with documentType, topics, entities, ocrQuality. Text: "${text.substring(0, maxLength)}"`;
        const response = await this.request('/api/generate', {
          method: 'POST',
          body: JSON.stringify({ model: this.model, prompt, stream: false, temperature: 0.2 })
        });
        if (response.data?.response) {
          const m = response.data.response.match(/\{[\s\S]*\}/);
          if (m) return { analysis: this._safeJsonParse(m[0]), source: 'ollama' };
        }
      } catch {}
    }
    return { analysis: null, source: 'fallback' };
  }

  /**
   * Generate OCR enhancement suggestions
   */
  async generateOcrSuggestions(ocrText, metadata = {}) {
    if (await this._isAiServiceAvailable()) {
      const result = await this._callAiService('suggestions', {
        document_type: metadata.documentType || 'document', recent_actions: ['ocr'], context: { ocr_text_length: ocrText.length }
      });
      if (result?.suggestions) return { suggestions: result.suggestions.map(s => ({ issue: s.description, fix: s.command, impact: 'medium' })), source: 'ai-service' };
    }
    if (await this.isAvailable()) {
      try {
        const prompt = `Given this OCR text, suggest 3 improvements. Return JSON with suggestions array. Text preview: "${ocrText.substring(0, 1500)}"`;
        const response = await this.request('/api/generate', {
          method: 'POST', body: JSON.stringify({ model: this.model, prompt, stream: false, temperature: 0.3 })
        });
        if (response.data?.response) {
          const m = response.data.response.match(/\{[\s\S]*\}/);
          if (m) return { suggestions: (this._safeJsonParse(m[0]) || {}).suggestions || [], source: 'ollama' };
        }
      } catch {}
    }
    return { suggestions: [], source: 'fallback' };
  }

  /**
   * Fallback parser for when Ollama is unavailable
   */
  fallbackParsePdfCommand(command, context = {}) {
    const lowerCmd = command.toLowerCase();
    
    // Simple rule-based parsing
    const intentMap = {
      compress: 'COMPRESS',
      smaller: 'COMPRESS',
      reduce: 'COMPRESS',
      delete: lowerCmd.includes('blank') ? 'DELETE_BLANK_PAGES' : 'DELETE_PAGES',
      remove: lowerCmd.includes('blank') ? 'DELETE_BLANK_PAGES' : 'DELETE_PAGES',
      rotate: 'ROTATE_PAGES',
      spin: 'ROTATE_PAGES',
      split: 'SPLIT_PDF',
      separate: 'SPLIT_PDF',
      watermark: 'ADD_WATERMARK',
      stamp: 'ADD_TEXT',
      redact: 'REDACT_TEXT',
      hide: 'REDACT_TEXT',
      extract: 'EXTRACT_PAGES',
      get: 'EXTRACT_PAGES',
      merge: 'MERGE_PDF',
      combine: 'MERGE_PDF',
      ocr: 'OCR_DOCUMENT',
      recognize: 'OCR_DOCUMENT'
    };

    let intent = 'UNKNOWN';
    let confidence = 0.3;

    for (const [key, value] of Object.entries(intentMap)) {
      if (lowerCmd.includes(key)) {
        intent = value;
        confidence = 0.7;
        break;
      }
    }

    // Extract page numbers if present
    const ordinalMap = {
      first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
      sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10
    };
    const pages = [];
    const pageRegex = /\b(?:page|pages)\s*(\d+)\b/gi;
    let pageMatch;
    while ((pageMatch = pageRegex.exec(command)) !== null) {
      const afterNumber = command.slice(pageRegex.lastIndex, pageRegex.lastIndex + 12).toLowerCase();
      if (/^\s*(degree|degrees)\b/.test(afterNumber)) continue;
      const page = parseInt(pageMatch[1], 10);
      if (page && !pages.includes(page)) pages.push(page);
    }
    Object.entries(ordinalMap).forEach(([word, page]) => {
      if (new RegExp(`\\b(?:page\\s+)?${word}\\b`, 'i').test(command) && !pages.includes(page)) {
        pages.push(page);
      }
    });
    const normalized = this.normalizeParseResult({
      intent,
      confidence,
      entities: { pages },
      needs_clarification: confidence < 0.6,
      clarification_question: confidence < 0.6 ? 'Could you be more specific about what you want me to do?' : null
    }, command);

    return {
      ...normalized,
      source: 'fallback'
    };
  }

  normalizeParseResult(result, originalCommand = '') {
    const intentAliases = {
      DELETE: 'DELETE_PAGES',
      ROTATE: 'ROTATE_PAGES',
      SPLIT: 'SPLIT_PDF',
      WATERMARK: 'ADD_WATERMARK',
      REDACT: 'REDACT_TEXT',
      EXTRACT: 'EXTRACT_PAGES',
      MERGE: 'MERGE_PDF',
      OCR: 'OCR_DOCUMENT'
    };

    const intent = intentAliases[result.intent] || result.intent || 'UNKNOWN';
    const entities = result.entities || {};
    const parameters = entities.parameters || {};
    const pages = Array.isArray(entities.pages) ? entities.pages.map(Number).filter(Boolean) : [];
    const lower = originalCommand.toLowerCase();
    const allPages = /\b(all|every|entire)\b/.test(lower);
    const textMatch = originalCommand.match(/["']([^"']+)["']/);
    const watermarkText = parameters.text || textMatch?.[1] || (lower.includes('confidential') ? 'CONFIDENTIAL' : 'DRAFT');
    const angleMatch = originalCommand.match(/\b(90|180|270|360)\b/);
    const degree = Number(parameters.degree || angleMatch?.[1] || 90);

    const buildAction = (type) => {
      switch (type) {
        case 'COMPRESS':
          return { type, priority: 'normal', parameters: parameters || {} };
        case 'DELETE_PAGES':
          return { type, priority: 'normal', parameters: { pages: allPages ? 'all' : pages } };
        case 'DELETE_BLANK_PAGES':
          return { type, priority: 'high', parameters: {} };
        case 'ROTATE_PAGES':
          return { type, priority: 'normal', parameters: { pages: allPages || pages.length === 0 ? 'all' : pages, degree } };
        case 'EXTRACT_PAGES':
          return { type, priority: 'normal', parameters: { pages } };
        case 'SPLIT_PDF': {
          const afterMatch = originalCommand.match(/(?:after|at)?\s*page\s*(\d+)/i);
          return { type, priority: 'normal', parameters: { afterPage: parameters.afterPage || (lower.includes('half') ? 'half' : Number(afterMatch?.[1] || 1)) } };
        }
        case 'ADD_WATERMARK':
          return { type, priority: 'normal', parameters: { text: watermarkText } };
        case 'ADD_TEXT':
          return { type, priority: 'normal', parameters: { text: watermarkText, pages: allPages || pages.length === 0 ? 'all' : pages } };
        case 'REDACT_TEXT':
          return { type, priority: 'normal', parameters: { pages: allPages || pages.length === 0 ? 'all' : pages, position: parameters.position || (lower.includes('bottom') ? 'bottom' : lower.includes('half') || lower.includes('middle') ? 'half' : 'top') } };
        case 'CROP_PAGES':
          return { type, priority: 'normal', parameters: { pages: allPages || pages.length === 0 ? 'all' : pages, margin: parameters.margin || 0 } };
        case 'DUPLICATE_PAGES':
          return { type, priority: 'normal', parameters: { pages } };
        case 'REMOVE_DUPLICATES':
        case 'OCR_DOCUMENT':
        case 'MERGE_PDF':
          return { type, priority: type === 'MERGE_PDF' ? 'high' : 'normal', parameters: parameters || {} };
        default:
          return null;
      }
    };

    const actions = Array.isArray(result.actions) && result.actions.length
      ? result.actions.map(action => ({
          ...action,
          type: intentAliases[action.type] || action.type,
          priority: action.priority || 'normal',
          parameters: action.parameters || {}
        })).filter(action => buildAction(action.type))
      : [buildAction(intent)].filter(Boolean);

    const needsClarification = Boolean(result.needs_clarification || result.clarification_needed);
    const missingPages = ['DELETE_PAGES', 'EXTRACT_PAGES', 'DUPLICATE_PAGES'].includes(intent) && !allPages && pages.length === 0;

    return {
      intent,
      confidence: Number(result.confidence || 0.3),
      entities: { ...entities, pages },
      actions,
      needs_clarification: needsClarification || missingPages,
      clarification_question: result.clarification_question || (missingPages ? 'Which pages should I use for this action?' : '')
    };
  }

  /**
   * Test connection to Ollama and AI services
   */
  async testConnection() {
    this._available = null; // Force fresh check
    this._aiServiceAvailable = null; // Force fresh check
    const url = this.baseUrl;
    const model = this.model;
    const diagnostics = { url, model, ai_service_url: this.aiServiceUrl, node_version: process.version };

    // Test AI Service
    if (this.aiServiceUrl) {
      try {
        const aiResp = await fetch(`${this.aiServiceUrl}/api/v1/ai/health`, {
          signal: AbortSignal.timeout(10000)
        });
        const aiData = await aiResp.json().catch(() => ({}));
        diagnostics.ai_service = { status: aiResp.status, ok: aiResp.ok, data: aiData };
    } catch {
      this._aiServiceAvailable = false;
      this._aiServiceLastCheck = Date.now();
      return false;
    }
    } else {
      diagnostics.ai_service = { note: 'AI_SERVICE_URL not configured' };
    }

    try {
      const hostname = url.replace(/^https?:\/\//, '').replace(/:.*$/, '');
      const dns = await import('dns/promises').catch(() => null);
      if (dns) {
        try {
          const addrs = await dns.default.resolve4(hostname);
          diagnostics.dns = addrs;
        } catch (dnsErr) {
          diagnostics.dns_error = dnsErr.message;
        }
      }
    } catch (_) {}

    try {
      const response = await this.request('/api/tags', { method: 'GET' }, 5000);
      diagnostics.status_code = response.status;
      diagnostics.models_found = response.data?.models?.length || 0;

      if (response.ok && response.data?.models?.length > 0) {
        diagnostics.available = true;
        this._setAvailable(true);
        return { success: true, message: `Connected to Ollama (${model})`, url, diagnostics };
      }
      diagnostics.available = false;
      return { success: false, message: 'Ollama responded but no models found', url, diagnostics };
    } catch (error) {
      diagnostics.available = false;
      diagnostics.error = error.message;
      return { success: false, message: error.message, url, diagnostics };
    }
  }
}

module.exports = new OllamaService();
