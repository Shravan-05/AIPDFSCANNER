const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence, RunnablePassthrough } = require('@langchain/core/runnables');

const PDF_COMMAND_SYSTEM_PROMPT = [
  'You are an AI that parses natural language PDF editing commands into structured JSON.',
  'Available intents: COMPRESS, DELETE_PAGES, EXTRACT_PAGES, ROTATE_PAGES, MERGE, SPLIT, ADD_WATERMARK, ADD_TEXT, REDACT_TEXT, DUPLICATE_PAGES, ENCRYPT_PDF, DELETE_BLANK_PAGES, ENHANCE, OCR, REORDER, ANALYZE.',
  'Return JSON with keys: intent, confidence (0-1), actions (array with type/priority/parameters fields), entities (array), needs_clarification (bool), clarification_question (string).',
  'Action parameters may include: pages, page_ranges, degree, text, position, quality, password, direction.',
  'Return ONLY valid JSON, no explanations.'
].join('\n');

const ANALYZE_DOCUMENT_SYSTEM_PROMPT = [
  'You are a document analysis AI. Classify document text and extract key information.',
  'Return JSON with keys: document_type, summary, entities (array with type/value), confidence, suggestions.'
].join('\n');

class LangChainService {
  constructor() {
    this._llm = null;
    this._available = false;
    this._parseChain = null;
    this._analyzeChain = null;
    this._retries = 0;
  }

  async initialize() {
    const provider = process.env.LLM_PROVIDER || 'ollama';
    const model = process.env.LLM_MODEL || 'qwen2.5:0.5b';

    try {
      if (provider === 'openai') {
        const { ChatOpenAI } = require('@langchain/openai');
        this._llm = new ChatOpenAI({
          model,
          temperature: 0.1,
          maxTokens: 2048,
          timeout: 300000,
          apiKey: process.env.OPENAI_API_KEY,
        });
      } else {
        const { ChatOllama } = require('@langchain/ollama');
        this._llm = new ChatOllama({
          model,
          baseUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
          temperature: 0.1,
          numPredict: 2048,
          timeout: 300000,
        });
      }

      this._buildChains();
      this._available = true;
    } catch {
      this._available = false;
    }
  }

  _buildChains() {
    const parsePrompt = ChatPromptTemplate.fromMessages([
      ['system', PDF_COMMAND_SYSTEM_PROMPT],
      ['human', 'Command: {command}\nContext: {context}\nParse this command into JSON.'],
    ]);

    this._parseChain = RunnableSequence.from([
      parsePrompt,
      this._llm,
      new StringOutputParser(),
    ]);

    const analyzePrompt = ChatPromptTemplate.fromMessages([
      ['system', ANALYZE_DOCUMENT_SYSTEM_PROMPT],
      ['human', 'Text: {text}\nAnalyze this document.'],
    ]);

    this._analyzeChain = RunnableSequence.from([
      analyzePrompt,
      this._llm,
      new StringOutputParser(),
    ]);
  }

  get isAvailable() {
    return this._available;
  }

  async _testConnection() {
    let url = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    if (process.env.OLLAMA_DEPLOYED === 'true' && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      url = 'http://localhost:11434';
    }
    try {
      const response = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  async warmup() {
    if (!this._available) return;
    const ok = await this._testConnection();
    if (!ok) this._available = false;
  }

  extractJson(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      try {
        const cleaned = match[0]
          .replace(/\/\/.*$/gm, '')
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/'/g, '"');
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
  }

  async parseCommand(command, context = {}) {
    if (!this._available || !this._parseChain) return null;
    try {
      const raw = await this._parseChain.invoke({
        command,
        context: JSON.stringify(context),
      });
      return this.extractJson(raw);
    } catch (err) {
      this._available = false;
      console.log(`[LangChain] LLM call failed (${err.message}), disabled for this session`);
      return null;
    }
  }

  async analyzeDocument(text, maxLength = 3000) {
    if (!this._available || !this._analyzeChain) return null;
    try {
      const raw = await this._analyzeChain.invoke({
        text: text.substring(0, maxLength),
      });
      return this.extractJson(raw);
    } catch (err) {
      this._available = false;
      console.log(`[LangChain] LLM call failed (${err.message}), disabled for this session`);
      return null;
    }
  }
}

module.exports = new LangChainService();
